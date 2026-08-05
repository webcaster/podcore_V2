# PDF Export Enhancements for v2.15.0

## Changes to `/interviews/partners/:partnerId/export-pdf`

### New Query Parameters
- `customMessage` (string, optional) - Custom greeting message for the PDF
- `episodeId` (string, optional) - Link to specific episode
- `documentName` (string, optional) - Custom PDF filename (without .pdf extension)

### Implementation Details

1. **Custom Document Name**
   - Add parameter: `const customDocumentName = req.query.documentName as string | undefined;`
   - Update filename generation: `const filename = customDocumentName || \`Interview-Fragen-${partner.name.replace(/[^a-zA-Z0-9]/g, '_')}\`;`
   - Update Content-Disposition: `res.setHeader('Content-Disposition', \`attachment; filename="${filename}.pdf"\`);`

2. **Document Title**
   - Update: `const documentTitle = customDocumentName || \`Interview-Vorbereitung: ${partner.name}\`;`

3. **Episode Information in PDF**
   - Add episode details (number, title, description, recording date) if episodeId is provided
   - Format using PDF layout typography

### Code Changes Required

Location: `server/routers/editorial.ts` lines 1730-1813

Replace the export-pdf endpoint with enhanced version that:
1. Accepts documentName query parameter
2. Uses custom document name in PDF filename
3. Includes episode information in the PDF body when episodeId is provided
4. Maintains CI/branding from PDF layout

### Example Usage

```
GET /api/editorial/interviews/partners/{partnerId}/export-pdf?customMessage=Custom%20greeting&episodeId={episodeId}&documentName=Interview-Vorbereitung-Max-Mustermann
```

This will generate a PDF named "Interview-Vorbereitung-Max-Mustermann.pdf" with custom greeting and episode information.
