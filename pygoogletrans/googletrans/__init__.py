"""Free Google Translate API for Python. Translates totally free of charge."""

__all__ = 'Translator',
__version__ = '4.0.0'


from pygoogletrans.googletrans.client import Translator
from pygoogletrans.googletrans.constants import LANGCODES, LANGUAGES  # noqa
