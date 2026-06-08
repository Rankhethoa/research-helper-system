import { Router }     from "express";
import { ObjectId }   from "mongodb";
import { getDB }      from "../config/db.js";
import { mapProfessor } from "../utils/mappers.js";
import { COLLECTION_PROFESSORS } from "../config/config.js";

const router = Router();

//Helper
const col = () => getDB().collection(COLLECTION_PROFESSORS);

router.get("/filters", async (_req, res) => {
  try {
    const [departments, researchAreas] = await Promise.all([
      col().distinct("department"),
      col().distinct("researchAreas").then(async (arr) =>
        arr.length ? arr : col().distinct("research_area")
      ),
    ]);

    res.json({
      departments:   departments.filter(Boolean).sort(),
      researchAreas: researchAreas.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("[professors/filters]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const {
      search       = "",
      department   = "",
      researchArea = "",
      accepting    = "",
      sort         = "name",
      page         = "1",
      limit        = "12",
    } = req.query;

    // Filter
    const filter = {};

    if (search) {
      const rx = new RegExp(search, "i");
      filter.$or = [
        { name:          rx },
        { department:    rx },
        { researchAreas: rx },
        { research_area: rx },
      ];
    }

    if (department) filter.department = department;

    if (researchArea) {
      filter.$or = [
        ...(filter.$or || []),
        { researchAreas: researchArea },
        { research_area: researchArea },
      ];
    }

    if (accepting === "true") filter.acceptingStudents = true;

    // Sort 
    const sortMap = {
      name:       { name: 1 },
      department: { department: 1, name: 1 },
      accepting:  { acceptingStudents: -1, name: 1 },
    };
    const mongoSort = sortMap[sort] || { name: 1 };

    // Pagination 
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const pageSize = Math.min(1000, Math.max(1, parseInt(limit, 10) || 12));
    const skip     = (pageNum - 1) * pageSize;

    // Query
    const [docs, total] = await Promise.all([
      col().find(filter).sort(mongoSort).skip(skip).limit(pageSize).toArray(),
      col().countDocuments(filter),
    ]);

    res.json({
      data:  docs.map(mapProfessor),
      total,
      page:  pageNum,
      limit: pageSize,
    });
  } catch (err) {
    console.error("[professors]", err.message);
    res.status(500).json({ error: err.message });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const doc = await col().findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: "Professor not found." });
    res.json(mapProfessor(doc));
  } catch (err) {
    console.error("[professors/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
