from shared.registry import get_engine
def test_engine():
    e=get_engine("market_maker");s=e.start()
    p=e.public_state(s); assert p["scenario"]["id"]=="mm01"
    r=e.apply_action(s,{"curve":"demand","direction":"right","price_dir":"up","qty_dir":"up"})
    assert r.accepted and s.round_index==1 and r.score_delta>=90
