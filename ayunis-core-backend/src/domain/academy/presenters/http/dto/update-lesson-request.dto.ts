import { CreateLessonRequestDto } from './create-lesson-request.dto';

// Update body reuses the create fields and validation. `title` and `loomUrl`
// replace the stored values. `description` is optional: omitting it keeps the
// existing description, while sending `null` clears it.
export class UpdateLessonRequestDto extends CreateLessonRequestDto {}
