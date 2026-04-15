const {
  changeSubcategoryStatus,
  createSubcategoryRecord,
  getSubcategoriesList,
  getSubcategoryDetails,
  removeSubcategoryRecord,
  updateSubcategoryRecord,
} = require("../services/subcategories.service");
const { sendSuccess } = require("../utils/response");

async function list(req, res) {
  const data = await getSubcategoriesList(req.query);
  return sendSuccess(res, data);
}

async function getById(req, res) {
  const data = await getSubcategoryDetails(Number(req.params.id));
  return sendSuccess(res, data);
}

async function create(req, res) {
  const data = await createSubcategoryRecord(req.body);
  return sendSuccess(res, data, 201);
}

async function update(req, res) {
  const data = await updateSubcategoryRecord(Number(req.params.id), req.body);
  return sendSuccess(res, data);
}

async function updateStatus(req, res) {
  const data = await changeSubcategoryStatus(Number(req.params.id), req.body.ativo);
  return sendSuccess(res, data);
}

async function remove(req, res) {
  const data = await removeSubcategoryRecord(Number(req.params.id));
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
