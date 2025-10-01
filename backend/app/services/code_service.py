import secrets

BASE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
SPECIALS = "!@#$%&*?"
DEFAULT_ALPHABET = BASE_ALPHABET + SPECIALS

def generate_code(length: int = 4, alphabet: str = DEFAULT_ALPHABET) -> str:
    """Generate a random join code (default length=4)."""
    return "".join(secrets.choice(alphabet) for _ in range(length))
