npm_deps:
	yarn install

build: npm_deps
	./node_modules/.bin/webpack -p

dev: npm_deps
	./node_modules/.bin/webpack -w
