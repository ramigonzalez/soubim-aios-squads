"""response_text() reads the answer even when the model puts a thinking block first."""

from types import SimpleNamespace

from app.services.llm_client import response_text


def test_skips_thinking_blocks():
    response = SimpleNamespace(content=[
        SimpleNamespace(type="thinking", thinking="…"),
        SimpleNamespace(type="text", text='{"items": []}'),
    ])
    assert response_text(response) == '{"items": []}'


def test_joins_text_blocks_and_accepts_untyped_blocks():
    response = SimpleNamespace(content=[SimpleNamespace(type="text", text="a"), SimpleNamespace(text="b")])
    assert response_text(response) == "ab"
