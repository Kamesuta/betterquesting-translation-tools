// Define a constant list of translatable keys
const TRANSLATABLE_KEYS = [
    'name:8',
    'desc:8',
    'Name:8',
];

// Define joint characters for concatenating CSV fields
const JOINT_CHARACTERS = {
    'name:8': ' | ',
    'desc:8': '\\n\\n\\n',
    'Name:8': ' | ',
};

module.exports = {
    TRANSLATABLE_KEYS,
    JOINT_CHARACTERS
};
