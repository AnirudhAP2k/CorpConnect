import os
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    """
    Initializes a structured logging system that stores separate log files 
    for major components in the 'logs/' folder.
    """
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.getcwd(), "logs")
    os.makedirs(log_dir, exist_ok=True)

    # Modern format includes timestamp, level, logger name, and message
    log_format = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. ROOT LOGGER (Console + app.log)
    # All logs flow through here by default
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Console output for uvicorn terminal
    if not any(isinstance(h, logging.StreamHandler) for h in root.handlers):
        console = logging.StreamHandler()
        console.setFormatter(log_format)
        root.addHandler(console)

    # General app.log (catch-all for audit trail)
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename.endswith("app.log") for h in root.handlers):
        app_file = RotatingFileHandler(
            os.path.join(log_dir, "app.log"),
            maxBytes=10*1024*1024, # 10MB
            backupCount=3,
            encoding="utf-8"
        )
        app_file.setFormatter(log_format)
        root.addHandler(app_file)

    # 2. COMPONENT-SPECIFIC LOGGERS
    # These map application modules to specific log files as requested
    log_mapping = {
        "app.routers.chat":      "chat.log",
        "app.routers.ingest":    "ingest.log",
        "app.routers.generate":  "generate.log",
        "app.routers.search":    "search.log",
        "app.routers.recommend": "recommend.log",
        "app.routers.embed":     "embed.log",
        "app.llm":               "llm.log",
    }

    for logger_name, log_file in log_mapping.items():
        logger = logging.getLogger(logger_name)
        # Add handler ONLY if it doesn't exist to avoid duplicate writes on reloads
        if not any(isinstance(h, RotatingFileHandler) and h.baseFilename.endswith(log_file) for h in logger.handlers):
            handler = RotatingFileHandler(
                os.path.join(log_dir, log_file),
                maxBytes=5*1024*1024, # 5MB
                backupCount=3,
                encoding="utf-8"
            )
            handler.setFormatter(log_format)
            logger.addHandler(handler)
            # Ensure it's at INFO level (overrides if root was higher)
            logger.setLevel(logging.INFO)

    logging.getLogger("uvicorn").info("Logging system initialised — files available in 'logs/'")
