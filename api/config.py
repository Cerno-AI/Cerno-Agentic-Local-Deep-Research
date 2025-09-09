from django.conf import settings
from agno.storage.sqlite import SqliteStorage
from agno.memory.v2.db.sqlite import SqliteMemoryDb
from agno.memory.v2.memory import Memory
from agno.models.openai import OpenAIChat, OpenAIResponses
import logging
import os
from agno.tools.file import FileTools
from agno.models.google import Gemini
from agno.models.ollama import Ollama
from .llm_registry import get_llm_instance
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

AGENT_OUTPUT_DIR = settings.BASE_DIR / "agent_outputs"
generic_file_tools = FileTools(base_dir=AGENT_OUTPUT_DIR, save_files=True, read_files=True, list_files=True)

logger = logging.getLogger(__name__)

# Storage and memory setup
agent_storage = SqliteStorage(
    db_file=str(settings.STORAGE_DB_PATH),
    table_name="agent_sessions"
)
memory_db_backend = SqliteMemoryDb(
    db_file=str(settings.MEMORY_DB_PATH),
    table_name="agent_memory"
)
agent_memory = Memory(db=memory_db_backend)

# LLM instances
default_llm1 = OpenAIChat(id="gpt-4.1-nano", temperature=0.2)
default_llm3 = OpenAIResponses(id="gpt-4.1-mini", temperature=0.2)

default_llm_gemini = Gemini(
    id="gemini-2.5-flash-preview-05-20",
    temperature=0.2,
    api_key=os.getenv("GEMINI_API_KEY"),
)

default_llm_ollama = Ollama(
    id="gpt-oss:120b",
    keep_alive=720
)

# Switch based on USE_LOCAL flag
USE_LOCAL = os.getenv("USE_LOCAL", "false").lower() == "true"
default_llm = default_llm_ollama if USE_LOCAL else default_llm_gemini

# API key check
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found in environment variables. Knowledge base embedding will fail.")
