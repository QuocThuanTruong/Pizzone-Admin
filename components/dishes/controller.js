const dishModel = require('./model')
const categoryModel = require('../categories/model')

const formidable = require('formidable');
const fs = require('fs')
const path = require('path');
const rimraf = require('rimraf')

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

exports.index = async (req, res, next) => {
    if ((Object.keys(req.query).length === 0 && req.query.constructor === Object) || (Object.keys(req.query).length === 1 && req.query.category!== undefined)) {
        const key_name = req.query.key_name;

        let categoryName = req.query.category;
        let currentPage = req.query.page;

        let sortBy = '1';
        let categories = await  categoryModel.getAllCategory()

        let categoryId = 0;
        if (categoryName === undefined || categoryName === "")
            categoryId = categories[0].category_id;

        for (let i = 0; i < categories.length; i++) {
            if (categories[i].name === categoryName) {
                categoryId = categories[i].category_id;
                categories[i].selected = "selected";

                break;
            }
        }

        if (currentPage === undefined)
            currentPage = '1';

        if (req.session.totalDishPerPage === undefined) {
            req.session.totalDishPerPage = 4
        }

        let totalDishPerPage = parseInt(req.session.totalDishPerPage)

        let totalDishPerPageOption = {
            option1: false,
            option2: false,
            option3: false,
        }
        switch (totalDishPerPage) {
            case 1 :
                totalDishPerPageOption.option1 = true;
                totalDishPerPageOption.option2 = false;
                totalDishPerPageOption.option3 = false;
                break;
            case 2 :
                totalDishPerPageOption.option1 = false;
                totalDishPerPageOption.option2 = true;
                totalDishPerPageOption.option3 = false;
                break;
            case 3 :
                totalDishPerPageOption.option1 = false;
                totalDishPerPageOption.option2 = false;
                totalDishPerPageOption.option3 = true;
                break;
        }

        let totalPage;
        let dishes;
        let totalResult = 0;

        let isPizzaSelected = false;

        if (key_name !== undefined) {
            dishes = await dishModel.searchByKeyName(key_name, currentPage, totalDishPerPage, sortBy)

            totalResult = dishes.length
        } else {
            dishes = await dishModel.listByCategory(categoryId, currentPage, totalDishPerPage, sortBy)

            totalResult = await dishModel.totalDishByCategory(categoryId);

            switch (categoryId) {
                case '1':
                    isPizzaSelected = true;
                    break;
            }

            totalPage = Math.ceil(totalResult / (totalDishPerPage * 1.0))
        }

        for (let dish of dishes) {
            dish.categoryName = await dishModel.getCategoryName(dish.category)
            dish.subCategoryName = await dishModel.getSubCategoryName(dish.category, dish.subcategory)

            const statusTitle = ['Đã xóa', 'Còn hàng', 'Hết hàng']
            dish.statusName = statusTitle[dish.status]
        }

        const dataContext = {
            isPizzaSelected: isPizzaSelected,
            categories: categories,
            totalDishPerPageOption: totalDishPerPageOption,
            totalResult: totalResult,
            dishes: dishes,
            totalPage: totalPage,
            page: currentPage,
            category: categoryId,
            isLogin: true
        }

        /*console.log(dataContext)*/

        res.render('.././components/dishes/views/index', dataContext);
    } else {
        this.pagination(req, res, next)
    }
}

exports.pagination = async (req, res, next) => {
    const key_name = req.query.key_name;

    let categoryName = req.query.category;
    let currentPage = req.query.page;
    let totalDishPerPage = req.query.total_dish_per_page;
    let sortBy = req.query.sortBy;

    /*console.log(req.query)*/

    let categories = await  categoryModel.getAllCategory()

    let categoryId = 0;
    if (categoryName === undefined || categoryName === "")
        categoryId = categories[0].category_id;

    for (let i = 0; i < categories.length; i++) {
        if (categories[i].name === categoryName) {
            categoryId = categories[i].category_id;
            categories[i].selected = "selected";

            break;
        }
    }

    if (currentPage === undefined)
        currentPage = '1';

    if (totalDishPerPage === undefined)
        totalDishPerPage = parseInt(req.session.totalDishPerPage);
    else {
        req.session.totalDishPerPage = parseInt(totalDishPerPage);
    }
    let totalPage;
    let dishes;
    let totalResult = 0;

    let isPizzaSelected = false;

    /*console.log("Key name: ", key_name)*/

    if (key_name !== undefined) {
        dishes = await dishModel.searchByKeyName(key_name, currentPage, totalDishPerPage, sortBy)

        totalResult = await dishModel.totalDishByKeyName(key_name)
    } else {
        dishes = await dishModel.listByCategory(categoryId, currentPage, totalDishPerPage, sortBy)

        totalResult = await dishModel.totalDishByCategory(categoryId);

        switch (categoryId) {
            case '1':
                isPizzaSelected = true;
                break;
        }

        totalPage = Math.ceil(totalResult / (totalDishPerPage * 1.0))
    }

    let totalDishPerPageOption1Selected = false;
    let totalDishPerPageOption2Selected = false;
    let totalDishPerPageOption3Selected = false;

    switch (totalDishPerPage) {
        case '1':
            totalDishPerPageOption1Selected = true;
            break;
        case '2':
            totalDishPerPageOption2Selected = true;
            break;
        case '3':
            totalDishPerPageOption3Selected = true;
            break;

    }

    for (let dish of dishes) {
        dish.categoryName = await dishModel.getCategoryName(dish.category)
        dish.subCategoryName = await dishModel.getSubCategoryName(dish.category, dish.subcategory)

        const statusTitle = ['Đã xóa', 'Còn hàng', 'Hết hàng']
        dish.statusName = statusTitle[dish.status]
    }

    const dataContext = {
        isPizzaSelected: isPizzaSelected,
        totalDishPerPageOption1Selected: totalDishPerPageOption1Selected,
        totalDishPerPageOption2Selected: totalDishPerPageOption2Selected,
        totalDishPerPageOption3Selected: totalDishPerPageOption3Selected,
        totalResult: totalResult,
        dishes: dishes,
        totalPage: totalPage,
        page: currentPage,
        category: categoryId,
        isLogin: true
    }

    res.send(dataContext)
}

exports.delete = async (req, res, next) => {
    const _ = await dishModel.delete(req.body['id'])

    this.index(req, res, next)
}

exports.update = async (req, res, next) => {
    let categoryParams = req.query.category

    let dish_id = req.params.id

    let dish = await dishModel.getDishById(dish_id)
    dish.images = await dishModel.getListImageById(dish_id)
    dish.size = await dishModel.getListSizeById(dish_id)

    let isPizzaSelected = false;
    let subcategories

    let categories = await  categoryModel.getAllCategory()
    let categoryId = 0;

    if (categoryParams !== "" && categoryParams !== undefined) {
        for (let i = 0; i < categories.length; i++) {
            if (categories[i].name === categoryParams) {
                categoryId = categories[i].category_id;
                categories[i].selected = "selected";

                break;
            }
        }

        switch (categoryId) {
            case 1:
                isPizzaSelected = true;
                break;

        }

        subcategories = await dishModel.getListSubcategory(categoryId)
        for (let i = 0; i < subcategories.length; i++) {
            if (subcategories[i].subcategory_id === dish.subcategory) {
                subcategories[i].selected = "selected";

                break;
            }
        }

    } else {
        for (let i = 0; i < categories.length; i++) {
            if (categories[i].category_id === dish.category) {
                categories[i].selected = "selected";

                break;
            }
        }

        switch (dish.category) {
            case 1:
                isPizzaSelected = true;
                break;
        }

        subcategories = await dishModel.getListSubcategory(dish.category)
        for (let i = 0; i < subcategories.length; i++) {
            if (subcategories[i].subcategory_id === dish.subcategory) {
                subcategories[i].selected = "selected";

                break;
            }
        }
    }

    let dataContext = {
        dish: dish,
        categories: categories,
        subcategories: subcategories,
        isPizzaSelected : isPizzaSelected,
        hasSubcategory: true
    }

    res.render('.././components/dishes/views/update', dataContext);
}

exports.updateInfo = async (req, res, next) => {
    fs.mkdirSync(path.join(__dirname, '..', 'tempImages'), { recursive: true })
    const form = formidable({multiples: true, keepExtensions: true, uploadDir : path.join(__dirname, '..', 'tempImages')})

    let oldDish =  await dishModel.getDishById(req.params.id)
    let oldImages = await dishModel.getListImageById(req.params.id)

    await form.parse(req, async (err, fields, files) => {
        if (err) {
            return
        }

        console.log(fields)

        let dish = await dishModel.modify(fields);
        dish.dish_id = req.params.id

        let categoryName;
        switch (dish.category) {
            case 1:
                categoryName = 'pizza';
                break;
            case 2:
                categoryName = 'drink';
                break;
            case 3:
                categoryName = 'side';
                break;
        }

        const avatarPicker = files.avatarPicker
        if (avatarPicker) {
            if (avatarPicker.name) {
                await cloudinary.uploader.upload(avatarPicker.path,
                    {
                        folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                        public_id: 'avatar',
                        overwrite: true
                    }, (err, res) => {
                        dish.avatar = res.secure_url
                    })
            }
            else {
                dish.avatar = ""
            }
        } else {
            dish.avatar = oldDish.avatar
        }

        let images = []

        const descriptionPicker1 = files.descriptionPicker1
        if (descriptionPicker1) {
            if (descriptionPicker1.name) {
                await cloudinary.uploader.upload(descriptionPicker1.path,
                    {
                        folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                        public_id: 'description-1',
                        overwrite: true
                    }, (err, res) => {
                        images.push({src: res.secure_url})
                    })
            }
            else {
                images.push({src: ""})
            }
        } else {
            images.push({src: oldImages[0].image_url})
        }

        console.log(oldImages)

        const descriptionPicker2 = files.descriptionPicker2
        if (descriptionPicker2) {
            if (descriptionPicker2.name) {
                await cloudinary.uploader.upload(descriptionPicker2.path,
                    {
                        folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                        public_id: 'description-2',
                        overwrite: true
                    }, (err, res) => {
                        images.push({src: res.secure_url})
                    })
            }
            else {
                images.push({src: ""})
            }
        } else {
            images.push({src: oldImages[1].image_url})
        }

        const descriptionPicker3 = files.descriptionPicker3
        if (descriptionPicker3) {
            if (descriptionPicker3.name) {
                await cloudinary.uploader.upload(descriptionPicker3.path,
                    {
                        folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                        public_id: 'description-3',
                        overwrite: true
                    }, (err, res) => {
                        images.push({src: res.secure_url})
                    })
            }
            else {
                images.push({src: ""})
            }
        } else {
            images.push({src: oldImages[2].image_url})
        }

        const descriptionPicker4 = files.descriptionPicker4
        if (descriptionPicker4) {
            if (descriptionPicker4.name) {
                await cloudinary.uploader.upload(descriptionPicker4.path,
                    {
                        folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                        public_id: 'description-4',
                        overwrite: true
                    }, (err, res) => {
                        images.push({src: res.secure_url})
                    })
            }
            else {
                images.push({src: ""})
            }
        } else {
            images.push({src: oldImages[3].image_url})
        }

        //console.log(pizza)
        dish.images = images

        console.log(dish)
        const _ = await dishModel.update(dish)

        fs.rmdirSync(path.join(__dirname, '..', 'tempImages'), {recursive: true})

        this.update(req, res, next)
    })
}

exports.add = async (req, res, next) => {
    let categoryName = req.query.category
    let categoryId = 1;

    let isPizzaSelected = false;
    let isDrinkSelected = false;
    let isSideSelected = false;

   /* console.log(categoryId)*/
    let categories = await  categoryModel.getAllCategory()

    if (categoryName === undefined || categoryName === "")
        categoryId = categories[0].category_id;

    for (let i = 0; i < categories.length; i++) {
        if (categories[i].name === categoryName) {
            categoryId = categories[i].category_id;
            categories[i].selected = "selected";

            break;
        }
    }

    switch (categoryId) {
        case 1:
            isPizzaSelected = true;
            break;

        case 2:
            isDrinkSelected = true;
            break;

        case 3:
            isSideSelected = true;
            break;
    }

    let subcategories = await dishModel.getListSubcategory(categoryId)

    let hasSubcategory = false;

    if (subcategories.length > 0) {
        hasSubcategory = true;
    }

    const dataContext = {
        isPizzaSelected: isPizzaSelected,
        isDrinkSelected: isDrinkSelected,
        isSideSelected: isSideSelected,
        categories: categories,
        hasSubcategory: hasSubcategory,
        subcategories: subcategories,
        isLogin: true
    }

    res.render('.././components/dishes/views/add', dataContext);
}

exports.addInfo = async (req, res, next) => {
    console.log(req.body)

    fs.mkdirSync(path.join(__dirname, '..', 'tempImages'), { recursive: true })
    const form = formidable({multiples: true, keepExtensions: true, uploadDir : path.join(__dirname, '..', 'tempImages')})

    await form.parse(req, async (err, fields, files) => {
        if (err) {
            return
        }

        let dish = await dishModel.modify(fields)
        dish.images = []

        let categoryName;
        switch (dish.category) {
            case 1:
                categoryName = 'pizza';
                break;
            case 2:
                categoryName = 'drink';
                break;
            case 3:
                categoryName = 'side';
                break;
        }

        const avatarPicker = files.avatarPicker
        if (avatarPicker.name) {
            await cloudinary.uploader.upload(avatarPicker.path,
                {
                    folder: 'WebFinalProject/Images/'+categoryName+'/'+dish.dish_id,
                    public_id: 'avatar',
                    overwrite: true
                }, (err, res) => {
                    dish.avatar = res.secure_url
                })
        }

        const descriptionPicker1 = files.descriptionPicker1
        if (descriptionPicker1.name) {
            //upload description
            await cloudinary.uploader.upload(descriptionPicker1.path,
                {
                    folder: 'WebFinalProject/Images/'+categoryName+'/'+dish.dish_id,
                    public_id: 'description-1',
                    overwrite: true
                }, (err, res) => {
                    dish.images.push({src: res.secure_url})
                })
        } else {
            dish.images.push({src: ""})
        }

        const descriptionPicker2 = files.descriptionPicker2
        if (descriptionPicker2.name) {
            //upload description
            await cloudinary.uploader.upload(descriptionPicker2.path,
                {
                    folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                    public_id: 'description-2',
                    overwrite: true
                }, (err, res) => {
                    dish.images.push({src: res.secure_url})
                })
        } else {
            dish.images.push({src: ""})
        }

        const descriptionPicker3 = files.descriptionPicker3
        if (descriptionPicker3.name) {
            //upload description
            await cloudinary.uploader.upload(descriptionPicker3.path,
                {
                    folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                    public_id: 'description-3',
                    overwrite: true
                }, (err, res) => {
                    dish.images.push({src: res.secure_url})
                })
        } else {
            dish.images.push({src: ""})
        }

        const descriptionPicker4 = files.descriptionPicker4
        if (descriptionPicker4.name) {
            //upload description
            await cloudinary.uploader.upload(descriptionPicker4.path,
                {
                    folder: 'WebFinalProject/Images/'+categoryName+'/'+dish._id,
                    public_id: 'description-4',
                    overwrite: true
                }, (err, res) => {
                    dish.images.push({src: res.secure_url})
                })
        } else {
            dish.images.push({src: ""})
        }

        console.log(dish)
        const _ = await dishModel.insert(dish)

        fs.rmdirSync(path.join(__dirname, '..', 'tempImages'), {recursive: true})

        this.add(req, res, next)
    })
}