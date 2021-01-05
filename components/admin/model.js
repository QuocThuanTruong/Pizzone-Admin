const {db} = require('../../dal/db')
const bcrypt = require('bcrypt')

function execQuery(queryString) {
    return new Promise(data => {
        /*        console.log(queryString)*/

        db.query(queryString, (err, results, fields) => {
            if (err) {
                console.log(err)
            } else {
                try {
                    data(results);
                } catch (error) {
                    data({});
                    throw error;
                }
            }
        })
    })
}

exports.getUserByUsernameAndPassword = async (username, password) => {
    const user = await execQuery('SELECT * FROM user WHERE username = \''+username+'\' and is_active = 1 and role = 1')


    if (user[0]) {
        let equal = await bcrypt.compareSync(password.toString(), user[0].password.toString());

        if (equal) {
            console.log(user[0].phone);

            return user[0]
        }
    }

    return false
}

exports.getUserById = async (id) => {
    const users =  await execQuery('SELECT * FROM user WHERE user_id = '+ id + ' and is_active = 1 and role = 1')
    let user = users[0];


    return user;
}

exports.modify = (fields, id) => {
    let user_id = id
    let name = fields.name
    let email = fields.email
    let phone = fields.phone
    let address = fields.address

    return {
        user_id: user_id,
        name: name,
        avatar: "",
        email: email,
        phone: phone,
        address: address,
    }
}

exports.update = async (newUser) => {
    const _ = await execQuery('UPDATE user SET name = \''+newUser.name+'\', avatar = \''+newUser.avatar+'\', email = \''+newUser.email+'\', phone = \''+newUser.phone+'\', address = \''+newUser.address+'\' WHERE user_id = '+newUser.user_id)
}

exports.isExistsUser = async (username) => {
    let result = await execQuery('SELECT EXISTS(SELECT * FROM user WHERE username = \''+username+'\' and is_active = 1 and role = 1) as e')

    return result[0].e;
}
