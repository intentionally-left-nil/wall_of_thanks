dev: compile
	python3 -m http.server 8000

backend:
	cd backend && cargo run

compile:
	tsc

.PHONY: $(MAKECMDGOALS)
