# Статичний сайт ERA BAND CAMP на nginx:alpine, порт 80
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf && mkdir -p /etc/nginx/snippets
COPY deploy/nginx.conf   /etc/nginx/conf.d/site.conf
COPY deploy/headers.conf /etc/nginx/snippets/headers.conf

# тільки те, що потрібно в браузері (див. .dockerignore)
COPY index.html robots.txt sitemap.xml favicon.ico /usr/share/nginx/html/
COPY privacy/ /usr/share/nginx/html/privacy/
COPY assets/  /usr/share/nginx/html/assets/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
