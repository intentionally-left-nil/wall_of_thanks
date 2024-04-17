dev: compile
	python3 -m http.server 8000

backend:
	cd backend && cargo run

compile:
	rm -rf js
	mkdir -p js
	tsc

.PHONY: $(MAKECMDGOALS)
