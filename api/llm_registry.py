import json
import os
import logging
from functools import lru_cache
import requests

from agno.models.openai import OpenAIChat
from agno.models.google import Gemini
from agno.models.ollama import Ollama
from agno.models.deepseek import DeepSeek
from agno.models.anthropic import Claude

import openai
import google.generativeai as genai
import anthropic

from core import settings

logger = logging.getLogger(__name__)
OPENAI_MODEL_WHITELIST = {
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-3.5-turbo"
}

GEMINI_MODEL_WHITELIST = {
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    "gemini-1.0-pro"
}

class ModelInfo:
    def __init__(self, provider: str, id: str, name: str):
        self.provider = provider
        self.id = id
        self.name = name

    def to_dict(self):
        return {"provider": self.provider, "id": self.id, "name": self.name}

@lru_cache(maxsize=1)
def discover_openai_models():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key: return []
    try:
        client = openai.OpenAI(api_key=api_key)
        models = client.models.list()
        supported_models = [m for m in models.data if m.id.startswith('gpt-')]
        return [ModelInfo("OpenAI", m.id, m.id.replace('-', ' ').title()) for m in supported_models]
    except Exception as e:
        logger.error(f"Could not discover OpenAI models: {e}")
        return []

@lru_cache(maxsize=1)
def discover_google_models():
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return []
    try:
        genai.configure(api_key=api_key)
        models = genai.list_models()
        supported_models = [m for m in models if 'generateContent' in m.supported_generation_methods]
        return [ModelInfo("Google", m.name.replace('models/', ''), m.display_name) for m in supported_models]
    except Exception as e:
        logger.error(f"Could not discover Google models: {e}")
        return []

@lru_cache(maxsize=1)
def discover_anthropic_models():
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key: return []
    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.models.list(limit=20)
        models = response.data
        supported_models = [m for m in models if m.id.startswith('claude-')]
        return [ModelInfo("Anthropic", m.id, m.display_name) for m in supported_models]
    except Exception as e:
        logger.error(f"Could not discover Anthropic models: {e}")
        return []

@lru_cache(maxsize=1)
def discover_deepseek_models():
    
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key: return []
    try:
        client = openai.OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        models = client.models.list()
        supported_models = models.data
        def format_name(id):
            return id.replace('-', ' ').title()
        return [ModelInfo("DeepSeek", m.id, format_name(m.id)) for m in supported_models]
    except Exception as e:
        logger.error(f"Could not discover DeepSeek models: {e}")
        return []

@lru_cache(maxsize=1)
def discover_ollama_models():
    
    default_ollama_host = "http://host.docker.internal:11434"
    host = os.getenv("OLLAMA_HOST", default_ollama_host)
    if not host: return []
    
    api_url = f"{host.rstrip('/')}/api/tags"
    try:
        response = requests.get(api_url, timeout=5)
        response.raise_for_status()
        data = response.json()
        models_data = data.get("models", [])
        if not models_data: return []
        discovered_models = []
        for model_info in models_data:
            full_name = model_info.get("name")
            if full_name:
                model_id = full_name  # Use the full name including the tag
                base_name = full_name.split(':')[0]
                display_name = base_name.replace('-', ' ').title()
                if ':' in full_name:
                    tag = full_name.split(':')[1]
                    display_name = f"{display_name} ({tag})"
                if not any(m.id == model_id for m in discovered_models):
                    discovered_models.append(ModelInfo("Ollama", model_id, display_name))
        return discovered_models
    except requests.exceptions.RequestException as e:
        logger.error(f"Could not connect to Ollama server at {host}. Error: {e}")
        return []
    except Exception as e:
        logger.error(f"An unexpected error occurred during Ollama model discovery: {e}")
        return []

def get_available_models():
    """
    Calls all discovery functions and returns a single aggregated list.
    (No change to this function's logic)
    """
    all_models = []
    all_models.extend(discover_openai_models())
    all_models.extend(discover_google_models())
    all_models.extend(discover_anthropic_models())
    all_models.extend(discover_deepseek_models()) 
    all_models.extend(discover_ollama_models())
    return [m.to_dict() for m in all_models]

@lru_cache(maxsize=1)
def load_static_cloud_models():
    """Loads the pre-generated list of cloud models from the JSON file."""
    file_path = os.path.join(settings.BASE_DIR, 'api', 'data', 'available_models.json')
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Could not load static models from {file_path}. Error: {e}. Please run 'python manage.py generate_models_json'.")
        return {}

def get_available_models_grouped():
    """
    This is the single source of truth for the model list.
    It loads static cloud models and merges them with live Ollama models.
    Ollama models are placed first in the list when available.
    """
    
    grouped_models = load_static_cloud_models()

    try:
        
        live_ollama_models = discover_ollama_models()
        if live_ollama_models:
            grouped_models["Ollama"] = [m.to_dict() for m in live_ollama_models]
            print(f"Dynamically discovered {len(live_ollama_models)} Ollama models.")
    except Exception as e:
        print(f"Could not dynamically fetch Ollama models. They will not be available. Error: {e}")

    # Reorder the dictionary to put Ollama first if it exists
    if "Ollama" in grouped_models:
        reordered_models = {"Ollama": grouped_models["Ollama"]}
        for provider, models in grouped_models.items():
            if provider != "Ollama":
                reordered_models[provider] = models
        return reordered_models
    
    return grouped_models

def get_llm_instance(model_id: str, provider: str):
    """
    UPDATED: This factory is now simpler. It receives the provider and
    instantiates the correct class. It no longer does any discovery.
    """
    logger.info(f"Creating LLM instance for model '{model_id}' from provider '{provider}'")

    from agno.models.openai import OpenAIChat
    from agno.models.google import Gemini
    from agno.models.ollama import Ollama
    from agno.models.deepseek import DeepSeek
    from agno.models.anthropic import Claude

    if provider == "OpenAI":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not set.")
            return None
        return OpenAIChat(id=model_id, temperature=0.2, api_key=api_key)

    if provider == "Google":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not set.")
            return None
        return Gemini(id=model_id, temperature=0.2, api_key=api_key)

    if provider == "Anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("ANTHROPIC_API_KEY not set.")
            return None
        return Claude(id=model_id, temperature=0.2, api_key=api_key)

    if provider == "DeepSeek":
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            logger.error("DEEPSEEK_API_KEY not set.")
            return None
        return DeepSeek(id=model_id, temperature=0.2, api_key=api_key)

    if provider == "Ollama":
        host = os.getenv("OLLAMA_HOST")
        if not host:
            logger.error("OLLAMA_HOST not set.")
            return None
        return Ollama(id=model_id, host=host)

    logger.error(f"Unknown provider '{provider}' requested for model '{model_id}'.")
    return None
