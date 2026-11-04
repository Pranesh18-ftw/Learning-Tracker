package com.learningtracker.companion.data

class IllegalSessionStateTransitionException(message: String) : IllegalStateException(message)
class MissingSessionAuthoritativeEvidenceException(message: String) : IllegalArgumentException(message)
class SessionIdMismatchException(message: String) : IllegalArgumentException(message)
class MigrationAccountingException(message: String) : IllegalStateException(message)
class DatabaseDegradedException(message: String) : IllegalStateException(message)
class DatabaseStorageFullException(message: String) : IllegalStateException(message)
class DatabaseRecoveryInProgressException(message: String) : IllegalStateException(message)
