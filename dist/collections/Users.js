"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Users = void 0;
var VerifyEmail_1 = require("../components/emails/VerifyEmail");
var adminAndUser = function (_a) {
    var user = _a.req.user;
    if (user.role === 'admin')
        return true;
    return {
        id: {
            equals: user.id,
        },
    };
};
exports.Users = {
    slug: 'users',
    auth: {
        verify: {
            generateEmailHTML: function (_a) {
                var token = _a.token;
                return (0, VerifyEmail_1.VerifyEmailHtml)({
                    actionLabel: 'verify your account',
                    buttonText: 'Verify Account',
                    href: "".concat(process.env.NEXT_PUBLIC_SERVER_URL, "/verify-email?token=").concat(token),
                });
            },
        },
    },
    access: {
        read: adminAndUser,
        create: function () { return true; },
        update: function (_a) {
            var req = _a.req;
            return req.user.role === 'admin';
        },
        delete: function (_a) {
            var req = _a.req;
            return req.user.role === 'admin';
        },
    },
    admin: {
        hidden: function (_a) {
            var user = _a.user;
            return user.role !== 'admin';
        },
        defaultColumns: ['id'],
    },
    fields: [
        {
            name: 'products',
            label: 'Products',
            admin: {
                condition: function () { return false; },
            },
            type: 'relationship',
            relationTo: 'products',
            hasMany: true,
        },
        {
            name: 'products_files',
            label: 'Products files',
            admin: {
                condition: function () { return false; },
            },
            type: 'relationship',
            relationTo: 'product_files',
            hasMany: true,
        },
        {
            name: 'role',
            defaultValue: 'user',
            required: true,
            admin: {
                // condition: ({req}) => req.user.role === "admin"
                condition: function () { return false; },
            },
            type: 'select',
            options: [
                { label: 'Admin', value: 'admin' },
                { label: 'User', value: 'user' },
            ],
        },
    ],
};
