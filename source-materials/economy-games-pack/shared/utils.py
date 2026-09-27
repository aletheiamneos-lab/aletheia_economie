from __future__ import annotations
from itertools import product
from typing import Iterable, List, Tuple

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def pct_score(correct: int, total: int) -> float:
    return 0.0 if total <= 0 else round(100.0 * correct / total, 2)

def best_discrete_bundle(prices, marginal_utilities, budget):
    # Brute-force discrete optimizer for small educational cases.
    max_q = [len(mu) for mu in marginal_utilities]
    best = None
    best_u = -1.0
    for bundle in product(*[range(q + 1) for q in max_q]):
        spend = sum(bundle[i] * prices[i] for i in range(len(prices)))
        if spend <= budget:
            utility = sum(sum(marginal_utilities[i][:bundle[i]]) for i in range(len(bundle)))
            if utility > best_u:
                best_u = utility
                best = bundle
    return tuple(best), float(best_u)
