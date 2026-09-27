import pytest

from api.economy_games import InvalidGameResult, parse_game_result


def test_accepts_an_official_finished_event():
    result = parse_game_result({
        "source": "economy-lab",
        "version": 1,
        "gameId": "03_factory_master",
        "type": "finished",
        "coins": 17,
        "maxCoins": 20,
        "stars": 3,
    })

    assert result.to_dict() == {
        "game_id": "03_factory_master",
        "coins": 17,
        "max_coins": 20,
        "stars": 3,
    }


def test_rejects_non_final_events():
    with pytest.raises(InvalidGameResult, match="only 'finished'"):
        parse_game_result({
            "source": "economy-lab",
            "version": 1,
            "gameId": "03_factory_master",
            "type": "coins",
            "coins": 4,
            "maxCoins": 20,
            "stars": 1,
        })


def test_rejects_a_tampered_maximum_score():
    with pytest.raises(InvalidGameResult, match="maxCoins"):
        parse_game_result({
            "source": "economy-lab",
            "version": 1,
            "gameId": "03_factory_master",
            "type": "finished",
            "coins": 17,
            "maxCoins": 999,
            "stars": 3,
        })
