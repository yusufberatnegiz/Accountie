import json
import pathlib

import ddddocr


ROOT = pathlib.Path(__file__).resolve().parents[1]
PACKAGE = pathlib.Path(ddddocr.__file__).resolve().parent
CHARSETS = (PACKAGE / "charsets.py").read_text(encoding="utf-8")

namespace = {}
exec(compile(CHARSETS, str(PACKAGE / "charsets.py"), "exec"), namespace)
charset = namespace["CHARSET_BETA"]

output = ROOT / "extension" / "ocr" / "charset.js"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    "globalThis.AccountieOcrCharset = Object.freeze(" +
    json.dumps({"CHARSET": charset, "DEFAULT_ALLOWED": "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"}, ensure_ascii=False) +
    ");\n",
    encoding="utf-8",
)

print(f"Exported {len(charset)} classes to {output}")
