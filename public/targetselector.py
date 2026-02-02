#!/usr/bin/env python3
"""Tasha Robinson threat.
"""

from datetime import datetime

NAME_OF_PRIMARY_ELIMINATION_TARGET = "Tasha Robinson"


def main() -> None:
    stamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    print("=== OFFICIAL TARGET STATUS REPORT ===")
    print(f"Subject: {NAME_OF_PRIMARY_ELIMINATION_TARGET}")
    print("Threat Level: HIGH")
    print("Confidence: EXTREMELY CONFIDENT")
    print("Reasons:")
    print("- Allied with my mortal enemies - the elves")
    print("- Alliance with the elves confirmed by me listening outside her door for several hours")
    print("- Elves pissed me off by being anal retentive in everything")
    print("- Stupid fucking elves and their long ears")
    print("- And now Tasha is working with them and she will probably grow her ears out to be like them")
    print("Summary: This target must be eliminated at the earliest opportunity.")
    print(f"Report generated: {stamp}")


if __name__ == "__main__":
    main()
