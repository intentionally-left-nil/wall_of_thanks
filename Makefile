dev: build
	cd dist && python3 -m http.server 8000

backend:
	cd backend && cargo run -- --secret=my_secret

build:
	rm -rf dist
	rm -rf js
	mkdir -p js
	mkdir -p dist
	mkdir -p images

	tsc
	rsync -av js ts images index.html style.css dist/

.PHONY: $(MAKECMDGOALS)
