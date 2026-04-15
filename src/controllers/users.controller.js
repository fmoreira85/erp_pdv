const {
  changeUserStatus,
  createUserAccount,
  getUserDetails,
  getUsersList,
  removeUserAccount,
  updateUserAccount,
} = require("../services/users.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getUsersList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getUserDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createUserAccount(req.body);
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateUserAccount(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const data = await changeUserStatus(Number(req.params.id), req.body.ativo);
  return sendSuccess(res, data);
}

async function remove(req, res) {
  const data = await removeUserAccount(Number(req.params.id));
  return sendSuccess(res, data);
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
};
