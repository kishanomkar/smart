"""Compatibility entry point for the shared live flow detector."""

try:
    from live_detector import main
except ImportError:
    from .live_detector import main


if __name__ == "__main__":
    main()
