"""비밀번호 해시. 표준 라이브러리 hashlib.scrypt와 사용자별 salt를 쓴다(새 패키지 없음).

저장 형식: scrypt$n$r$p$salt(16진수)$hash(16진수). 원문 비밀번호는 저장·출력하지 않는다.
"""

import hashlib
import hmac
import secrets

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SALT_BYTES = 16
KEY_BYTES = 32


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p, dklen=KEY_BYTES)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    key = _scrypt(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${key.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, n, r, p, salt_hex, key_hex = stored.split("$")
        if algorithm != "scrypt":
            return False
        key = _scrypt(password, bytes.fromhex(salt_hex), int(n), int(r), int(p))
    except ValueError:
        return False
    # 비교 시간으로 값이 드러나지 않게 한다.
    return hmac.compare_digest(key, bytes.fromhex(key_hex))
