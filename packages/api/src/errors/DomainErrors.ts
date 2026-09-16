import { AppError } from '@errors/AppError.js'

export class FirstNameRequiredError extends AppError {
  constructor() {
    super('El nombre es requerido')
  }
}

export class LastNameRequiredError extends AppError {
  constructor() {
    super('El apellido es requerido')
  }
}

export class PasswordHashRequiredError extends AppError {
  constructor() {
    super('El hash de la contraseña es requerido')
  }
}

export class InvalidRoleError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Rol inválido')
  }
}

export class InvalidEmailError extends AppError {
  constructor() {
    super('Formato de correo electrónico inválido')
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Credenciales inválidas', 401)
  }
}

export class DuplicatedEmailError extends AppError {
  constructor() {
    super('El correo electrónico ya está en uso')
  }
}

export class EmployeeNotFoundError extends AppError {
  constructor() {
    super('Empleado no encontrado', 404)
  }
}

export class RestaurantNameRequiredError extends AppError {
  constructor() {
    super('El nombre del restaurante es requerido')
  }
}

export class RestaurantAddressRequiredError extends AppError {
  constructor() {
    super('La dirección del restaurante es requerida')
  }
}

export class RestaurantEmailRequiredError extends AppError {
  constructor() {
    super('El correo electrónico del restaurante es requerido')
  }
}

export class RestaurantNotFoundError extends AppError {
  constructor() {
    super('Restaurante no encontrado', 404)
  }
}

export class InvalidPhoneError extends AppError {
  constructor() {
    super('Formato de teléfono inválido')
  }
}

export class OwnerFirstNameRequiredError extends AppError {
  constructor() {
    super('El nombre del propietario es requerido')
  }
}

export class OwnerLastNameRequiredError extends AppError {
  constructor() {
    super('El apellido del propietario es requerido')
  }
}

export class IngredientNameRequiredError extends AppError {
  constructor() {
    super('El nombre del ingrediente es requerido')
  }
}

export class IngredientNotFoundError extends AppError {
  constructor() {
    super('Ingrediente no encontrado', 404)
  }
}

export class InvalidUnitError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Unidad inválida')
  }
}

export class NegativeStockError extends AppError {
  constructor() {
    super('El stock no puede ser negativo')
  }
}

export class RestaurantIdRequiredError extends AppError {
  constructor() {
    super('El ID del restaurante es requerido')
  }
}

export class DishNameRequiredError extends AppError {
  constructor() {
    super('El nombre del plato es requerido')
  }
}

export class InvalidPriceError extends AppError {
  constructor() {
    super('El precio debe ser un número positivo')
  }
}

export class InvalidCategoryError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Categoría inválida')
  }
}

export class DishNotFoundError extends AppError {
  constructor() {
    super('Plato no encontrado', 404)
  }
}

export class DatabaseNotInitializedError extends AppError {
  constructor() {
    super('La base de datos no está inicializada. Llama primero a dbConfig.initialize().')
  }
}

export class InvalidOrderStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Estado del pedido inválido')
  }
}

export class OrderNotFoundError extends AppError {
  constructor() {
    super('Pedido no encontrado')
  }
}

export class BugReportDescriptionRequiredError extends AppError {
  constructor() {
    super('La descripción del reporte es requerida')
  }
}

export class BugReportDescriptionTooShortError extends AppError {
  constructor() {
    super('La descripción debe tener al menos 10 caracteres')
  }
}

export class BugReportDescriptionTooLongError extends AppError {
  constructor() {
    super('La descripción no puede superar los 5000 caracteres')
  }
}

export class GithubIssueCreationError extends AppError {
  constructor() {
    super('No se pudo crear la issue en GitHub', 502)
  }
}

export class TableNumberRequiredError extends AppError {
  constructor() {
    super('Table number is required')
  }
}

export class InvalidTableNumberError extends AppError {
  constructor() {
    super('Table number must be a positive integer')
  }
}

export class InvalidTableCapacityError extends AppError {
  constructor() {
    super('Table capacity must be a positive integer')
  }
}

export class InvalidTableStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid table status')
  }
}

export class TableNotFoundError extends AppError {
  constructor() {
    super('Table not found', 404)
  }
}

export class DuplicatedTableNumberError extends AppError {
  constructor() {
    super('There is already a table with this number in the restaurant')
  }
}

export class TableNotAvailableError extends AppError {
  constructor() {
    super('The table is not available')
  }
}

export class TableCapacityExceededError extends AppError {
  constructor() {
    super('The table does not have enough capacity for the party size')
  }
}

export class InvalidPartySizeError extends AppError {
  constructor() {
    super('Party size must be a positive integer')
  }
}
