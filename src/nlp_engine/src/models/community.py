import torch
import torch.nn as nn
from transformers import BertModel


class CommunityClassifier:
    def __init__(self, shared_encoder: BertModel, head_path: str, device: str = "cpu"):
        self.encoder = shared_encoder
        self.device = device
        hidden_size = shared_encoder.config.hidden_size

        self.head = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(hidden_size, 1),
        )

        try:
            state = torch.load(head_path, map_location=device, weights_only=True)
            self.head.load_state_dict(state)
        except Exception:
            pass

        self.head.to(device)
        self.head.eval()

    def predict(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> float:
        with torch.no_grad():
            cls = self.encoder(
                input_ids=input_ids, attention_mask=attention_mask
            ).last_hidden_state[:, 0, :]
            logit = self.head(cls)
            return torch.sigmoid(logit).item()
