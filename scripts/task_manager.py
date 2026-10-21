#!/usr/bin/env python3
"""タスクを登録・完了管理し、締切と重要度から優先度を付けて TASKS.md に出力する。

Usage:
    python3 scripts/task_manager.py add "タスク名" --due 2026-10-25 --category 営業 \
        --work-type 資料作成 [--importance 高|中|低] [--note "メモ"]
    python3 scripts/task_manager.py done <ID>
    python3 scripts/task_manager.py update <ID> [--due ...] [--category ...] ...
    python3 scripts/task_manager.py list
    python3 scripts/task_manager.py render [--today YYYY-MM-DD]
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TASKS_PATH = ROOT / "tasks" / "tasks.json"
OUTPUT_PATH = ROOT / "TASKS.md"

CATEGORIES = ["営業", "認証コンサル", "その他"]
WORK_TYPES = ["資料作成", "打合せ・訪問", "連絡・メール", "調査・リサーチ", "見積・契約", "事務処理", "その他"]
IMPORTANCE_SCORE = {"高": 3, "中": 2, "低": 1}
PRIORITY_ORDER = {"S": 0, "A": 1, "B": 2, "C": 3}


def urgency(due: str | None, today: date) -> tuple[str, int, int | None]:
    """締切までの日数から緊急度ラベル・スコア・残日数を返す。"""
    if not due:
        return "🔵 締切なし", 0, None
    days = (date.fromisoformat(due) - today).days
    if days < 0:
        return "⚫ 期限超過", 5, days
    if days <= 1:
        return "🔴 至急", 4, days
    if days <= 3:
        return "🟠 緊急", 3, days
    if days <= 7:
        return "🟡 今週中", 2, days
    return "🟢 余裕あり", 1, days


def priority(urg_score: int, importance: str) -> str:
    score = urg_score * 2 + IMPORTANCE_SCORE[importance]
    if score >= 9:
        return "S"
    if score >= 7:
        return "A"
    if score >= 5:
        return "B"
    return "C"


def load() -> list[dict]:
    if not TASKS_PATH.exists():
        return []
    return json.loads(TASKS_PATH.read_text(encoding="utf-8"))


def save(tasks: list[dict]):
    TASKS_PATH.write_text(json.dumps(tasks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def enrich(tasks: list[dict], today: date) -> list[dict]:
    rows = []
    for t in tasks:
        label, score, days = urgency(t.get("due"), today)
        rows.append({**t, "urgency": label, "urg_score": score, "days": days,
                     "priority": priority(score, t["importance"])})
    rows.sort(key=lambda r: (PRIORITY_ORDER[r["priority"]], -r["urg_score"],
                             -IMPORTANCE_SCORE[r["importance"]], r.get("due") or "9999"))
    return rows


def days_text(days: int | None) -> str:
    if days is None:
        return "-"
    if days < 0:
        return f"{-days}日超過"
    if days == 0:
        return "今日"
    return f"あと{days}日"


def row_md(r: dict) -> str:
    return (f"| {r['priority']} | {r['id']} | {r['title']} | {r.get('due') or '-'} | {days_text(r['days'])} "
            f"| {r['urgency']} | {r['importance']} | {r['category']} | {r['work_type']} | {r.get('note', '')} |")


HEADER = ("| 優先度 | ID | タスク | 締切 | 残り | 緊急度 | 重要度 | 区分 | 作業種類 | メモ |\n"
          "|---|---|---|---|---|---|---|---|---|---|")


def render(today: date):
    tasks = load()
    open_rows = enrich([t for t in tasks if not t.get("done")], today)
    done_rows = [t for t in tasks if t.get("done")]

    lines = [f"# タスク優先度一覧", "", f"基準日: {today.isoformat()}  /  未完了 {len(open_rows)} 件", ""]
    lines += ["## 凡例", "",
              "- 緊急度(締切までの日数): ⚫期限超過 / 🔴至急(1日以内) / 🟠緊急(3日以内) / 🟡今週中(7日以内) / 🟢余裕あり / 🔵締切なし",
              "- 優先度: 緊急度×2 + 重要度(高3・中2・低1) で算出 → S(9以上) / A(7-8) / B(5-6) / C(4以下)", ""]

    lines += ["## 全体(優先度順)", "", HEADER] + [row_md(r) for r in open_rows] + [""]

    for cat in CATEGORIES:
        rows = [r for r in open_rows if r["category"] == cat]
        lines += [f"## {cat}({len(rows)}件)", ""]
        lines += [HEADER] + [row_md(r) for r in rows] if rows else ["(なし)"]
        lines.append("")

    lines += ["## 作業種類別", ""]
    for wt in WORK_TYPES:
        rows = [r for r in open_rows if r["work_type"] == wt]
        if rows:
            lines.append(f"- **{wt}**: " + "、".join(f"[{r['priority']}] {r['title']}" for r in rows))
    lines.append("")

    if done_rows:
        lines += ["## 完了済み", ""] + [f"- ~~{t['title']}~~({t['category']} / 完了 {t['done']})" for t in done_rows] + [""]

    OUTPUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Rendered: {OUTPUT_PATH}")


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    def task_args(sp, required: bool):
        sp.add_argument("--due", help="締切 YYYY-MM-DD")
        sp.add_argument("--category", choices=CATEGORIES, required=required)
        sp.add_argument("--work-type", choices=WORK_TYPES, required=required)
        sp.add_argument("--importance", choices=list(IMPORTANCE_SCORE), default=None if not required else "中")
        sp.add_argument("--note")

    a = sub.add_parser("add"); a.add_argument("title"); task_args(a, True)
    u = sub.add_parser("update"); u.add_argument("id", type=int); u.add_argument("--title"); task_args(u, False)
    d = sub.add_parser("done"); d.add_argument("id", type=int)
    sub.add_parser("list")
    r = sub.add_parser("render"); r.add_argument("--today")
    args = p.parse_args()

    today = date.today()
    tasks = load()

    if args.cmd == "add":
        if args.due:
            date.fromisoformat(args.due)
        new_id = max((t["id"] for t in tasks), default=0) + 1
        tasks.append({"id": new_id, "title": args.title, "due": args.due, "category": args.category,
                      "work_type": args.work_type, "importance": args.importance,
                      "note": args.note or "", "created": today.isoformat(), "done": None})
        save(tasks)
        print(f"Added #{new_id}: {args.title}")
    elif args.cmd in ("update", "done"):
        t = next((t for t in tasks if t["id"] == args.id), None)
        if t is None:
            sys.exit(f"Task #{args.id} not found")
        if args.cmd == "done":
            t["done"] = today.isoformat()
        else:
            for key in ("title", "due", "category", "work_type", "importance", "note"):
                val = getattr(args, key)
                if val is not None:
                    t[key] = val
        save(tasks)
        print(f"Updated #{args.id}")
    elif args.cmd == "list":
        for r in enrich([t for t in tasks if not t.get("done")], today):
            print(f"[{r['priority']}] #{r['id']} {r['title']} 締切:{r.get('due') or '-'} "
                  f"{r['urgency']} 重要度:{r['importance']} {r['category']}/{r['work_type']}")
        return
    if args.cmd == "render":
        today = date.fromisoformat(args.today) if args.today else today
    render(today)


if __name__ == "__main__":
    main()
