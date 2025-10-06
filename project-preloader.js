(function (global) {
    function formatResourceName(url) {
        try {
            const parsed = new URL(url);
            const pathname = parsed.pathname.replace(/^\/+/, '');
            return pathname || parsed.href;
        } catch (e) {
            return url;
        }
    }

    function preload(options) {
        const {
            initialPages = [],
            coreAssets = [],
            minDisplayTime = 1500,
            fallbackTimeout = 20000,
            baseUrl = global.location ? global.location.href : undefined,
            onProgress = function () { }
        } = options || {};

        return new Promise((resolve) => {
            const assetQueue = [];
            const assetMap = new Map();
            let totalAssets = 0;
            let completedAssets = 0;
            let currentIndex = 0;

            const startTime = Date.now();
            let fallbackTimer = null;

            const emitProgress = (url, overridePercent) => {
                const percent = typeof overridePercent === 'number'
                    ? overridePercent
                    : (totalAssets === 0
                        ? 100
                        : Math.min(100, Math.round((completedAssets / totalAssets) * 100)));

                onProgress({
                    percent,
                    currentUrl: url || null,
                    displayName: url ? formatResourceName(url) : null,
                    totalAssets,
                    completedAssets
                });
            };

            const enqueue = (url, type = 'auto', contextUrl = baseUrl) => {
                if (!url) {
                    return;
                }

                const trimmed = url.trim();
                if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
                    return;
                }

                let absoluteUrl;
                try {
                    absoluteUrl = new URL(trimmed, contextUrl).href;
                } catch (e) {
                    return;
                }

                if (absoluteUrl === (global.location ? global.location.href : absoluteUrl)) {
                    return;
                }

                if (assetMap.has(absoluteUrl)) {
                    return;
                }

                assetMap.set(absoluteUrl, type);
                assetQueue.push({ url: absoluteUrl, type });
                totalAssets += 1;
                emitProgress(absoluteUrl);
            };

            const detectType = (url, hint) => {
                if (hint && hint !== 'auto') {
                    return hint;
                }
                const cleanUrl = url.split('?')[0].split('#')[0];
                const extension = cleanUrl.substring(cleanUrl.lastIndexOf('.') + 1).toLowerCase();
                if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'].includes(extension)) {
                    return 'image';
                }
                if (extension === 'css') {
                    return 'css';
                }
                if (extension === 'html' || extension === 'htm') {
                    return 'html';
                }
                if (['js', 'mjs', 'cjs'].includes(extension)) {
                    return 'js';
                }
                if (['json', 'geojson'].includes(extension)) {
                    return 'json';
                }
                return 'generic';
            };

            const markCompleted = (url) => {
                completedAssets += 1;
                emitProgress(url);
            };

            const loadImage = (url) => new Promise((resolveImage) => {
                const image = new Image();
                image.onload = () => resolveImage();
                image.onerror = () => resolveImage();
                image.src = url;
            });

            const fetchText = (url) => fetch(url)
                .then((response) => (response.ok ? response.text() : ''))
                .catch(() => '');

            const fetchGeneric = (url) => fetch(url)
                .then(() => undefined)
                .catch(() => undefined);

            const processSrcset = (value, contextUrl) => {
                if (!value) {
                    return;
                }
                value.split(',').forEach((entry) => {
                    const trimmed = entry.trim();
                    if (!trimmed) {
                        return;
                    }
                    const spaceIndex = trimmed.indexOf(' ');
                    const candidate = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex);
                    enqueue(candidate, 'image', contextUrl);
                });
            };

            const processCss = (url, cssText) => {
                if (!cssText) {
                    return;
                }
                const regex = /url\(([^)]+)\)/gi;
                let match;
                while ((match = regex.exec(cssText)) !== null) {
                    const resource = match[1].trim().replace(/^['"]|['"]$/g, '');
                    if (!resource || resource.startsWith('data:') || resource.startsWith('#')) {
                        continue;
                    }
                    enqueue(resource, 'auto', url);
                }
            };

            const processHtml = (url, htmlText) => {
                if (!htmlText) {
                    return;
                }
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                doc.querySelectorAll('link[href]').forEach((link) => {
                    const rel = (link.getAttribute('rel') || '').toLowerCase();
                    const href = link.getAttribute('href');
                    if (!href) {
                        return;
                    }
                    if (rel.includes('stylesheet')) {
                        enqueue(href, 'css', url);
                    } else if (rel.includes('preload') || rel.includes('prefetch') || rel.includes('icon') || rel.includes('manifest')) {
                        enqueue(href, 'auto', url);
                    }
                });

                doc.querySelectorAll('script[src]').forEach((script) => {
                    const src = script.getAttribute('src');
                    enqueue(src, 'js', url);
                });

                doc.querySelectorAll('img[src]').forEach((img) => {
                    const src = img.getAttribute('src');
                    enqueue(src, 'image', url);
                    processSrcset(img.getAttribute('srcset'), url);
                });

                doc.querySelectorAll('source[src]').forEach((source) => {
                    enqueue(source.getAttribute('src'), 'image', url);
                });

                doc.querySelectorAll('source[srcset]').forEach((source) => {
                    processSrcset(source.getAttribute('srcset'), url);
                });

                doc.querySelectorAll('video[src], audio[src], iframe[src], track[src]').forEach((element) => {
                    enqueue(element.getAttribute('src'), 'auto', url);
                });

                doc.querySelectorAll('[data-src]').forEach((element) => {
                    enqueue(element.getAttribute('data-src'), 'auto', url);
                });

                doc.querySelectorAll('a[href]').forEach((anchor) => {
                    const href = anchor.getAttribute('href');
                    if (!href) {
                        return;
                    }
                    if (/\.html?(?:[?#].*)?$/i.test(href)) {
                        enqueue(href, 'html', url);
                    }
                });

                doc.querySelectorAll('[style]').forEach((element) => {
                    const styleValue = element.getAttribute('style');
                    if (!styleValue) {
                        return;
                    }
                    const matches = styleValue.match(/url\(([^)]+)\)/gi);
                    if (!matches) {
                        return;
                    }
                    matches.forEach((match) => {
                        const resource = match.replace(/url\(([^)]+)\)/i, '$1').trim().replace(/^['"]|['"]$/g, '');
                        if (!resource || resource.startsWith('data:') || resource.startsWith('#')) {
                            return;
                        }
                        enqueue(resource, 'auto', url);
                    });
                });
            };

            const processAsset = async ({ url, type }) => {
                const detectedType = detectType(url, type);
                try {
                    if (detectedType === 'image') {
                        await loadImage(url);
                    } else if (detectedType === 'css') {
                        const cssText = await fetchText(url);
                        processCss(url, cssText);
                    } else if (detectedType === 'html') {
                        const htmlText = await fetchText(url);
                        processHtml(url, htmlText);
                    } else if (detectedType === 'js' || detectedType === 'json') {
                        await fetchText(url);
                    } else {
                        await fetchGeneric(url);
                    }
                } finally {
                    markCompleted(url);
                }
            };

            const drainQueue = async () => {
                while (currentIndex < assetQueue.length) {
                    const item = assetQueue[currentIndex];
                    currentIndex += 1;
                    // eslint-disable-next-line no-await-in-loop
                    await processAsset(item);
                }
            };

            const finish = () => {
                if (fallbackTimer !== null) {
                    clearTimeout(fallbackTimer);
                    fallbackTimer = null;
                }
                completedAssets = Math.max(completedAssets, totalAssets);
                emitProgress(null, 100);
                const elapsed = Date.now() - startTime;
                const waitTime = Math.max(0, minDisplayTime - elapsed);
                setTimeout(() => resolve(), waitTime);
            };

            fallbackTimer = setTimeout(() => {
                finish();
            }, fallbackTimeout);

            coreAssets.forEach((asset) => enqueue(asset, 'auto', baseUrl));
            initialPages.forEach((page) => enqueue(page, 'html', baseUrl));

            emitProgress(null, totalAssets === 0 ? 100 : 0);

            drainQueue()
                .then(finish)
                .catch(finish);
        });
    }

    global.ProjectPreloader = {
        preload,
        formatResourceName
    };
})(window);
