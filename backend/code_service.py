#!/usr/bin/env python3
"""
code_service.py
- CLI: python code_service.py -n 5          # prints 5 codes
- API: python code_service.py --serve        # serves GET /code -> {"code": "A7KQ"}

Alphabet excludes 0,1,I,O to avoid confusion.
"""

import argparse
import random
from typing import List

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
CODE_LEN = 4

def generate_codes(count: int = 1) -> List[str]:
    return [
        "".join(random.choice(ALPHABET) for _ in range(CODE_LEN))
        for _ in range(max(1, count))
    ]

def main():
    parser = argparse.ArgumentParser(description="4-char code generator (CLI or API).")
    parser.add_argument("-n", "--num", type=int, default=1, help="How many codes to generate (CLI mode).")
    parser.add_argument("--serve", action="store_true", help="Run a tiny API server (GET /code).")
    parser.add_argument("--host", default="127.0.0.1", help="API host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=5050, help="API port (default: 5050)")
    args = parser.parse_args()

    if args.serve:
        try:
            from flask import Flask, jsonify
        except ImportError:
            raise SystemExit("Flask not installed. Run:\n  python -m pip install flask")

        app = Flask(__name__)

        @app.get("/code")
        def get_code():
            code = generate_codes(1)[0]
            return jsonify({"code": code})

        print(f"Serving on http://{args.host}:{args.port}  (GET /code)")
        app.run(host=args.host, port=args.port, debug=True)
    else:
        for code in generate_codes(args.num):
            print(code)

if __name__ == "__main__":
    main()
