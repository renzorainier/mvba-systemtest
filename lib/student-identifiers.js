import Student from '@/models/Student';

export const KINDER_ONE_LEVEL = 'Kinder 1';
export const KINDER_LEVELS = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

export const normalizeLearnersReferenceNumber = (value) => String(value || '').trim();

export const generateRandomDigits = (length) => {
  let digits = '';

  for (let index = 0; index < length; index += 1) {
    digits += Math.floor(Math.random() * 10).toString();
  }

  return digits;
};

export const generateUniqueKinderOneLrn = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateRandomDigits(6);
    const existingStudent = await Student.exists({ learnersReferenceNumber: candidate });

    if (!existingStudent) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique Kinder 1 LRN');
};

export const isValidKinderOneLrn = (value) => /^\d{6}$/.test(value);

export const isValidKinderTwoToSixLrn = (value) => /^\d{12}$/.test(value);
