const { AD_URL, AD_BASE_DN, AD_DOMAIN } = process.env;

/**
 * Special admin user 
 */
const adminUser = {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || uuidv4()
}

/**
 * Special committee user
 */
const committeeUser = {
    username: 'committee',
    password: process.env.COMMITTEE_PASSWORD || uuidv4()
}