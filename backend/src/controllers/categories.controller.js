const {
  changeCategoryStatus,
  createCategoryRecord,
  getCategoriesList,
  getCategoryDetails,
  removeCategoryRecord,
  updateCategoryRecord,
} = require("../services/categories.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getCategoriesList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getCategoryDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createCategoryRecord(req.body);
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateCategoryRecord(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const data = await changeCategoryStatus(Number(req.params.id), req.body.ativo);
  return sendSuccess(res, data);
}

async function remove(req, res) {
  const data = await removeCategoryRecord(Number(req.params.id));
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
