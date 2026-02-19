"""Tests for validation scoring module."""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.validation import (
    _to_dict,
    _list_item_quality,
    _score_list_field,
)


class TestToDict:
    def test_dict_passthrough(self):
        assert _to_dict({"a": 1}) == {"a": 1}

    def test_none(self):
        assert _to_dict(None) == {}

    def test_string(self):
        assert _to_dict("hello") == {}

    def test_list(self):
        assert _to_dict([1, 2]) == {}

    def test_pydantic_model(self):
        class FakeModel:
            def model_dump(self):
                return {"x": 1}
        assert _to_dict(FakeModel()) == {"x": 1}


class TestListItemQuality:
    def test_empty_string(self):
        assert _list_item_quality("") == 0.0

    def test_short_string(self):
        score = _list_item_quality("Python")
        assert 0 < score <= 1.0

    def test_dict_with_details(self):
        item = {"nom": "Python", "details": "Langage de programmation versatile"}
        score = _list_item_quality(item)
        assert score > _list_item_quality("Python")

    def test_dict_bare(self):
        item = {"nom": "Python"}
        score = _list_item_quality(item)
        assert score > 0


class TestScoreListField:
    """_score_list_field returns {'score': float, 'max': float, 'commentaire': str}"""

    def test_empty_list(self):
        result = _score_list_field([], 10, 3, "test")
        assert result["score"] == 0

    def test_sufficient_items(self):
        items = [{"nom": f"Item {i}", "details": "Some detailed description here"} for i in range(5)]
        result = _score_list_field(items, 10, 3, "test")
        assert result["score"] > 5.0

    def test_bare_strings_score_lower(self):
        items = ["a", "b", "c", "d", "e"]
        result = _score_list_field(items, 10, 3, "test")
        rich_items = [{"nom": f"Item {i}", "details": "Detailed info here"} for i in range(5)]
        rich_result = _score_list_field(rich_items, 10, 3, "test")
        assert rich_result["score"] > result["score"]
