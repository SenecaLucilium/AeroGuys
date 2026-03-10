from typing import Optional

class OpenskyAPIError(Exception):
    """Базовое исключение для всех ошибок API"""
    pass


class RateLimitError(OpenskyAPIError):
    """Превышен лимит запросов (429)"""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class AuthenticationError(OpenskyAPIError):
    """Ошибка аутентификации (401)"""
    pass


class NotFoundError(OpenskyAPIError):
    """Данные не найдены (404)"""
    pass


class BadRequestError(OpenskyAPIError):
    """Неверные параметры запроса (400)"""
    pass


class ValidationError(OpenskyAPIError):
    """Ошибка валидации входных данных"""
    pass


class NetworkError(OpenskyAPIError):
    """Сетевая ошибка"""
    pass