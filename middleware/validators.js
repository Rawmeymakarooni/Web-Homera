/**
 * Validator middleware collection
 * Menggunakan Joi untuk validasi input
 */
const Joi = require('joi');
const createError = require('http-errors');

// Validasi untuk portofolio
const portofolioSchema = Joi.object({
  title: Joi.string().required().trim().max(100)
    .messages({
      'string.empty': 'Judul portofolio tidak boleh kosong',
      'string.max': 'Judul portofolio maksimal 100 karakter',
      'any.required': 'Judul portofolio wajib diisi'
    }),
  category: Joi.string().required().trim().max(50)
    .messages({
      'string.empty': 'Kategori portofolio tidak boleh kosong',
      'string.max': 'Kategori portofolio maksimal 50 karakter',
      'any.required': 'Kategori portofolio wajib diisi'
    }),
  description: Joi.string().allow('').max(2000)
    .messages({
      'string.max': 'Deskripsi portofolio maksimal 2000 karakter'
    })
});

// Validasi untuk furnitur
const furniturSchema = Joi.object({
  name: Joi.string().required().trim().max(100)
    .messages({
      'string.empty': 'Nama furnitur tidak boleh kosong',
      'string.max': 'Nama furnitur maksimal 100 karakter',
      'any.required': 'Nama furnitur wajib diisi'
    }),
  description: Joi.string().allow('').max(500)
    .messages({
      'string.max': 'Deskripsi furnitur maksimal 500 karakter'
    }),
  quantity: Joi.number().integer().min(1).required()
    .messages({
      'number.base': 'Jumlah harus berupa angka',
      'number.integer': 'Jumlah harus berupa bilangan bulat',
      'number.min': 'Jumlah minimal 1',
      'any.required': 'Jumlah wajib diisi'
    })
});

// Validasi untuk furnitur list (array)
const furniturListSchema = Joi.array().items(furniturSchema).max(50)
  .messages({
    'array.max': 'Maksimal 50 furnitur per portofolio'
  });

// Validasi untuk user
const userSchema = {
  registration: Joi.object({
    uname: Joi.string().required().trim().min(3).max(50)
      .messages({
        'string.empty': 'Username tidak boleh kosong',
        'string.min': 'Username minimal 3 karakter',
        'string.max': 'Username maksimal 50 karakter',
        'any.required': 'Username wajib diisi'
      }),
    email: Joi.string().required().email()
      .messages({
        'string.empty': 'Email tidak boleh kosong',
        'string.email': 'Format email tidak valid',
        'any.required': 'Email wajib diisi'
      }),
    password: Joi.string().required().min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
      .messages({
        'string.empty': 'Password tidak boleh kosong',
        'string.min': 'Password minimal 8 karakter',
        'string.pattern.base': 'Password harus mengandung huruf kecil, huruf besar, angka, dan karakter spesial',
        'any.required': 'Password wajib diisi'
      }),
    confirmPassword: Joi.string().required().valid(Joi.ref('password'))
      .messages({
        'string.empty': 'Konfirmasi password tidak boleh kosong',
        'any.only': 'Konfirmasi password tidak cocok',
        'any.required': 'Konfirmasi password wajib diisi'
      })
  }),
  
  login: Joi.object({
    email: Joi.string().required().email()
      .messages({
        'string.empty': 'Email tidak boleh kosong',
        'string.email': 'Format email tidak valid',
        'any.required': 'Email wajib diisi'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password tidak boleh kosong',
        'any.required': 'Password wajib diisi'
      }),
    setCookie: Joi.boolean().optional()
  }),
  
  changePassword: Joi.object({
    oldPassword: Joi.string().required()
      .messages({
        'string.empty': 'Password lama tidak boleh kosong',
        'any.required': 'Password lama wajib diisi'
      }),
    newPassword: Joi.string().required().min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
      .messages({
        'string.empty': 'Password baru tidak boleh kosong',
        'string.min': 'Password baru minimal 8 karakter',
        'string.pattern.base': 'Password baru harus mengandung huruf kecil, huruf besar, angka, dan karakter spesial',
        'any.required': 'Password baru wajib diisi'
      }),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword'))
      .messages({
        'string.empty': 'Konfirmasi password tidak boleh kosong',
        'any.only': 'Konfirmasi password tidak cocok',
        'any.required': 'Konfirmasi password wajib diisi'
      })
  })
};

/**
 * Generate middleware validator untuk suatu schema
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error } = schema.validate(data, { 
      abortEarly: false,
      allowUnknown: true, // Izinkan field yang tidak didefine di schema
      stripUnknown: false // Jangan hapus field yang tidak didefine di schema
    });
    
    if (error) {
      // Format error messages dari Joi menjadi human-readable
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return next(createError(400, 'Data input tidak valid', { 
        errors: errorDetails
      }));
    }
    
    // Filter data sesuai dengan schema
    // const validData = schema.validate(data).value;
    // req[source] = validData;
    
    return next();
  };
};

/**
 * Validasi JSON string yang akan di-parse sebagai JSON
 */
const validateJsonString = (field, schema) => {
  return (req, res, next) => {
    try {
      if (!req.body[field]) {
        return next();
      }
      
      const parsedData = JSON.parse(req.body[field]);
      const { error } = schema.validate(parsedData, { abortEarly: false });
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: `${field}.${detail.path.join('.')}`,
          message: detail.message
        }));
        
        return next(createError(400, `Data ${field} tidak valid`, { 
          errors: errorDetails
        }));
      }
      
      // Simpan data yang sudah divalidasi
      req.body[`_parsed_${field}`] = parsedData;
      
      return next();
    } catch (err) {
      return next(createError(400, `Format ${field} tidak valid, harus berupa JSON string`));
    }
  };
};

// Export validator middleware
module.exports = {
  validatePortofolio: validate(portofolioSchema),
  validateFurniturList: validateJsonString('furniturList', furniturListSchema),
  validateUser: {
    registration: validate(userSchema.registration),
    login: validate(userSchema.login),
    changePassword: validate(userSchema.changePassword)
  }
};
