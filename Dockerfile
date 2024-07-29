# ローカルDocker Desktopテストコマンド(webdanforjs＝ローカルDocker Desktopでの任意のイメージ名)
#   > docker build -t webdanforjs .
#   > docker run -p 4200:80 webdanforjs

FROM node:18.16.0-alpine AS app

# アプリケーションディレクトリ作成
WORKDIR /usr/src/app

# アプリケーションファイルをコピー
COPY . /usr/src/app

# ビルドエラー "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory" の対応
ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN npm install -g @angular/cli@12.2.7 && npm install --legacy-peer-deps && npm install rxfire@6.0.3 --legacy-peer-deps

# GitHub PagesまたはAWS EC2インスタンスの場合はこちらを有効に
RUN npm run "build-actions:staging"

# ローカルのDocker Desktopを使ってlocalhost確認する場合はこちらを有効に
# RUN npm run "build-actions:local"

FROM nginx:alpine

# compiled Angular application files を NGINX ドキュメントルートへコピー
COPY --from=app /usr/src/app/dist /var/www/html/

RUN ls /var/www/html/

# NGINX configuration file を Angular application実行のためにコピー
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# NGINXが使用するDockerポートをデフォルト80にセット
EXPOSE 80
