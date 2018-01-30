npm_deps:
	yarn install

build: npm_deps
	./node_modules/.bin/webpack -p --config webpack.prod.js

dev: npm_deps
	./node_modules/.bin/webpack -w --config webpack.dev.js
