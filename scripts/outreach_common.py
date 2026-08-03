#!/usr/bin/env python3
"""名刺フォローアップ用の共通ユーティリティ。

- CSV(Shift-JIS / UTF-8)の読み込み
- 会社名・部署名の正規化
- 役職の序列判定(to / cc の自動振り分けに使う)
- 氏名の表示形式
"""
from __future__ import annotations

import csv
import io
import json
import re
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTREACH_DIR = REPO_ROOT / "data" / "outreach"
GROUPING_PATH = OUTREACH_DIR / "grouping.json"
CONTACTS_PATH = OUTREACH_DIR / "contacts.json"
CAMPAIGN_PATH = OUTREACH_DIR / "campaign.json"

TODO = "<<要記入"

# 役職の序列。数値が大きいほど「to」になりやすい。
TITLE_RANKS: list[tuple[str, int]] = [
    ("代表取締役", 100),
    ("代表", 95),
    ("社長", 95),
    ("CEO", 95),
    ("役員", 90),
    ("本部長", 80),
    ("支店長", 78),
    ("館長", 76),
    ("部長代理", 68),
    ("部長", 70),
    ("次長", 65),
    ("課長代理", 55),
    ("課長", 60),
    ("室長", 60),
    ("係長", 50),
    ("マネージャー", 50),
    ("Manager", 50),
    ("リーダー", 45),
    ("チーフ", 45),
    ("主任", 40),
    ("副主任", 35),
    ("担当", 15),
    ("コーディネーター", 12),
    ("デザイナー", 10),
    ("Designer", 10),
]


def read_json(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def decode_csv(path: Path) -> str:
    """Eight書き出しのCSVはShift-JIS(CP932)が多いので順に試す。"""
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("cp932", errors="replace")


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFKC", value)
    return re.sub(r"\s+", " ", text).strip()


def company_key(company: str) -> str:
    """表記ゆれを吸収した会社名キー。"""
    text = normalize_text(company).lower()
    for noise in (
        "株式会社",
        "有限会社",
        "合同会社",
        "co., ltd.",
        "co.,ltd.",
        "co., ltd",
        "co.ltd",
        "ltd.",
        "inc.",
        "corporation",
        "corp.",
    ):
        text = text.replace(noise, "")
    return re.sub(r"[\s・,.\-_/()（）]", "", text)


def dept_key(department: str) -> str:
    text = normalize_text(department).lower()
    return re.sub(r"[\s・,.\-_/()（）]", "", text)


def title_rank(title: str) -> int:
    """役職名から序列を推定する。

    「課長代理」のように長い語が短い語(課長)を含む場合は、長い語を優先する。
    同じ長さで複数該当する場合は高い方を採用する。
    """
    text = normalize_text(title).lower()
    if not text:
        return 0
    matches = [(len(kw), rank) for kw, rank in TITLE_RANKS if kw.lower() in text]
    if not matches:
        return 0
    longest = max(length for length, _ in matches)
    return max(rank for length, rank in matches if length == longest)


def is_latin(text: str) -> bool:
    return bool(text) and all(ord(ch) < 0x80 for ch in text)


def display_name(last: str, first: str) -> str:
    """日本語は「姓 名」、ラテン文字は「First Last」で整形する。"""
    last, first = normalize_text(last), normalize_text(first)
    if is_latin(last) and is_latin(first):
        return f"{first.title()} {last.title()}".strip()
    return f"{last} {first}".strip()


def honorific(name: str) -> str:
    return f"{name} 様" if name else ""


def slugify(text: str, fallback: str = "group") -> str:
    """グループIDに使う英数字スラッグ。日本語しかない場合はローマ字化しない。"""
    base = re.sub(r"[^0-9a-zA-Z]+", "-", normalize_text(text)).strip("-").lower()
    return base or fallback


def load_contacts_from_csv(paths: list[Path], aliases: dict[str, str]) -> list[dict]:
    """CSV群を読み込んで連絡先レコードに正規化する(メールアドレスで重複排除)。"""
    contacts: dict[str, dict] = {}
    for path in paths:
        reader = csv.DictReader(io.StringIO(decode_csv(path)))
        for row in reader:
            row = {normalize_text(k): (v or "") for k, v in row.items() if k}
            email = normalize_text(row.get("e-mail")).lower()
            if not email:
                continue
            company_raw = normalize_text(row.get("会社名"))
            company = aliases.get(company_raw, company_raw)
            record = {
                "email": email,
                "last_name": normalize_text(row.get("姓")),
                "first_name": normalize_text(row.get("名")),
                "name": display_name(row.get("姓", ""), row.get("名", "")),
                "company": company,
                "company_raw": company_raw,
                "department": normalize_text(row.get("部署名")),
                "title": normalize_text(row.get("役職")),
                "tel": normalize_text(row.get("TEL直通"))
                or normalize_text(row.get("TEL会社")),
                "mobile": normalize_text(row.get("携帯電話")),
                "url": normalize_text(row.get("URL")),
                "exchanged_on": normalize_text(row.get("名刺交換日")).replace("/", "-"),
                "source_csv": path.name,
            }
            record["title_rank"] = title_rank(record["title"])
            if email in contacts:
                contacts[email].update({k: v for k, v in record.items() if v})
            else:
                contacts[email] = record
    return list(contacts.values())
