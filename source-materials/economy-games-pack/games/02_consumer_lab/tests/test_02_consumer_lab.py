from shared.registry import get_engine
def test_engine():
    e=get_engine("consumer_lab");s=e.start()
    r=e.apply_action(s,{"quantities":[2,2]})
    assert r.accepted and s.round_index==1 and 0<=r.score_delta<=100
