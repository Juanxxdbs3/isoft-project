"""BETO clinical model for depression, anxiety, and suicidal ideation detection.

This module provides the BETOClinicalModel class that loads a fine-tuned
BETO (bert-base-spanish-wwm-cased) backbone with separate classifier heads
for each clinical dimension. Designed as a drop-in replacement for ModelStub
with an identical predict() signature.
"""

from __future__ import annotations

import os

import torch
import torch.nn as nn
from transformers import BertConfig, BertModel, BertTokenizer

from src.stubs.model_stub import ModelScores


class BETOClinicalModel:
    """Real clinical classifier using a fine-tuned BETO backbone + 3 heads.

    The backbone is loaded from a local checkpoint (config.json +
    model.safetensors). The classifier heads for depression, anxiety and
    suicidal ideation are loaded from a separate ``classifier_heads.pt`` file.
    The tokenizer is loaded from the original HuggingFace model name so that
    the vocabulary is authoritative.

    Signature matches ``ModelStub.predict()`` exactly — swapping them
    requires zero changes in the pipeline.
    """

    def __init__(self, model_path: str) -> None:
        """Load backbone, tokenizer and classifier heads.

        Parameters
        ----------
        model_path : str
            Path to the directory containing ``config.json``,
            ``model.safetensors`` and ``classifier_heads.pt``.
        """
        self.device = torch.device("cpu")

        # ── Backbone: BETO from local checkpoint ──────────────
        config = BertConfig.from_pretrained(model_path)
        self.backbone = BertModel.from_pretrained(
            model_path,
            config=config,
        )
        self.backbone.to(self.device)
        self.backbone.eval()

        # ── Tokenizer: always from the original BETO name ─────
        # vocab.txt in the checkpoint was regenerated from HF hub,
        # so we load the tokenizer directly from HuggingFace to
        # guarantee consistency with the pretrained vocabulary.
        self.tokenizer = BertTokenizer.from_pretrained(
            "dccuchile/bert-base-spanish-wwm-cased",
        )

        # ── Classifier heads ──────────────────────────────────
        heads_path = os.path.join(model_path, "classifier_heads.pt")
        state = torch.load(heads_path, map_location=self.device, weights_only=True)

        hidden_size = config.hidden_size  # 768

        self.depression_head = nn.Linear(hidden_size, 1)
        self.anxiety_head = nn.Linear(hidden_size, 1)
        self.suicidal_head = nn.Linear(hidden_size, 1)

        # classifier_heads.pt keys end with ".1." because the
        # training code used nn.Sequential(Dropout(0.1), Linear(...))
        # where index 0 = Dropout, index 1 = Linear.
        self.depression_head.weight.data = state["depression_head.1.weight"]
        self.depression_head.bias.data = state["depression_head.1.bias"]
        self.anxiety_head.weight.data = state["anxiety_head.1.weight"]
        self.anxiety_head.bias.data = state["anxiety_head.1.bias"]
        self.suicidal_head.weight.data = state["suicidal_head.1.weight"]
        self.suicidal_head.bias.data = state["suicidal_head.1.bias"]

        self.depression_head.to(self.device).eval()
        self.anxiety_head.to(self.device).eval()
        self.suicidal_head.to(self.device).eval()

    def predict(self, text: str) -> ModelScores:
        """Run inference and return probability scores (0–100 scale).

        Parameters
        ----------
        text : str
            Preprocessed text (the pipeline guarantees this has already
            passed through ``TextPreprocessor``).

        Returns
        -------
        ModelScores
            Dataclass with ``p_depression``, ``p_anxiety``,
            ``p_suicidal`` (all 0–100) and ``score_norms`` (always 0.0
            because the clinical model does not predict norms).
        """
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.backbone(**inputs)
            # pooler_output = [CLS] token → tanh(dense(768→768))
            pooled = outputs.pooler_output  # (1, 768)

            p_depression = torch.sigmoid(self.depression_head(pooled)).item()
            p_anxiety = torch.sigmoid(self.anxiety_head(pooled)).item()
            p_suicidal = torch.sigmoid(self.suicidal_head(pooled)).item()

        return ModelScores(
            p_depression=round(p_depression * 100, 2),
            p_anxiety=round(p_anxiety * 100, 2),
            p_suicidal=round(p_suicidal * 100, 2),
            score_norms=0.0,
        )
