# syntax=docker/dockerfile:1.7

# 架构数据目录，构建时以 --build-context data=<目录> 替换。
FROM scratch AS data
COPY example/ /

FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
COPY --from=data / data/
RUN ARCH_DATA=data npm test && ARCH_DATA=data npm run build

FROM ghcr.io/nginx/nginx-unprivileged:1.30.5-alpine3.24@sha256:15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /src/dist/ /usr/share/nginx/html/
