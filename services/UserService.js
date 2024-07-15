import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';
import { Sequelize, Op } from 'sequelize';

const sequelize = new Sequelize({
    dialect: 'sqlite', 
    storage: './database.sqlite', 
    
});

const User = sequelize.define('User', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    cellphone: {
        type: Sequelize.STRING,
        allowNull: false
    },
    createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
});


const findUsers = async (queryParams) => {
    let whereClause = {
        status: true, 
    };
    
    let fechaInicioAntesISO, fechaInicioDespuesISO; 

    
    if (queryParams.status !== undefined) {
        whereClause.status = queryParams.status === 'true' ? true : false;
    }

    if (queryParams.name) {
        whereClause.name = {
            [Op.like]: `%${queryParams.name}%`
        };
    }

    if (queryParams.fechaInicioAntes && typeof queryParams.fechaInicioAntes === 'string') {
        fechaInicioAntesISO = queryParams.fechaInicioAntes.replace(/\//g, '-');
        whereClause.createdAt = {
            [Op.lt]: new Date(fechaInicioAntesISO)
        };
    }

    if (queryParams.fechaInicioDespues && typeof queryParams.fechaInicioDespues === 'string') {
        fechaInicioDespuesISO = queryParams.fechaInicioDespues.replace(/\//g, '-');
        whereClause.createdAt = {
            [Op.gt]: new Date(fechaInicioDespuesISO)
        };
    }

    const users = await db.User.findAll({
        where: whereClause
    });

    return {
        code: 200,
        message: users
    };
}

const bulkCreateUsers = async (usersList) => {
    let successCount = 0;
    let errorCount = 0;
    let errorUsers = [];

    
    if (!Array.isArray(usersList)) {
        throw new Error('La lista de usuarios no es un array válido.');
    }

    
    for (let userData of usersList) {
        try {
            
            if (!userData.name || !userData.email || !userData.password) {
                throw new Error('El usuario debe tener nombre, email y contraseña.');
            }
            if (userData.password != userData.password_second){
                throw new Error('Las contraseñas no coinciden');
            }
            
            const newUser = await db.User.create({
                name: userData.name,
                password: userData.password,
                status: userData.status !== undefined ? userData.status : true, 
                email: userData.email,
                cellphone: userData.cellphone
            });

            
            successCount++;
        } catch (error) {
            
            errorCount++;
            errorUsers.push(userData); 
            
            console.error(`Error al crear usuario ${userData.name}: ${error.message}`);
        }
    }

    
    return {
        successCount,
        errorCount,
        errorUsers
    };
}

const createUser = async (req) => {
    const {
        name,
        email,
        password,
        password_second,
        cellphone
    } = req.body;
    if (password !== password_second) {
        return {
            code: 400,
            message: 'Passwords do not match'
        };
    }
    const user = await db.User.findOne({
        where: {
            email: email
        }
    });
    if (user) {
        return {
            code: 400,
            message: 'User already exists'
        };
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
        name,
        email,
        password: encryptedPassword,
        cellphone,
        status: true
    });
    return {
        code: 200,
        message: 'User created successfully with ID: ' + newUser.id,
    }
};

const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}




const getAllUsers = async () => {
    try {
        const users = await db.User.findAll({
            where: {
                status: true 
            }
        });
        return {
            code: 200,
            message: users
        };
    } catch (error) {
        console.error('Error buscando a los usuarios:', error);
        return {
            code: 500,
            message: 'No se pudo traer los usuarios en la base de datos'
        };
    }
};

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers,
    findUsers,
    bulkCreateUsers,
}