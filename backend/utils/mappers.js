//MongoDB wrappers
export function mapProfessor(doc) {
    return {
      _id:               doc._id.toString(),
      name:              doc.name                || "",
      department:        doc.department          || "",
      researchAreas:     Array.isArray(doc.researchAreas)
                           ? doc.researchAreas
                           : doc.research_area
                             ? [doc.research_area]
                             : [],
      email:             doc.contact?.email      || doc.email || "",
      photoUrl:          doc.photoUrl            || "",
      profileUrl:        doc.profileUrl          || "",
      acceptingStudents: doc.acceptingStudents   ?? false,
      availableSlots:    doc.availableSlots      ?? 0,
    };
  }
  

export function mapStudent(doc) {
  return {
    _id:           doc._id.toString(),
    name:          doc.name           || "",
    college:       doc.college        || "",
    researchAreas: Array.isArray(doc.researchAreas)
                      ? doc.researchAreas
                      : doc.research_area
                        ? [doc.research_area]
                        : [],
    email:         doc.contact?.email || doc.email || "",
  };
}

//OpenAlex wrappers
//Decode an OpenAlex inverted abstract index back into a plain string.

export function decodeAbstract(invertedIndex) {
  if (!invertedIndex) return "No abstract available.";

  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.join(" ");
}

/*
Map a single OpenAlex work result → frontend paper shape.
 * @param {object} p  - Raw OpenAlex work object
 * @returns {object}
*/
export function mapWork(p) {
  return {
    title:      p.title || "Untitled",
    authors:    (p.authorships || [])
                  .map((a) => a.author?.display_name)
                  .filter(Boolean),
    venue:      p.primary_location?.source?.display_name || "Unknown venue",
    year:       p.publication_year || "N/A",
    abstract:   decodeAbstract(p.abstract_inverted_index),
    type:       p.type,
    citations:  p.cited_by_count  || 0,
    openAccess: p.open_access?.is_oa  || false,
    hasPdf:     !!p.open_access?.oa_url,
    pdfUrl:     p.open_access?.oa_url || "#",
    doi:        p.doi || null,
  };
}