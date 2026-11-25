-- Two more quiz marks. Adds enum values only; existing marks are unchanged.
ALTER TYPE "PopsQuizMark" ADD VALUE IF NOT EXISTS 'confidently_wrong' BEFORE 'tip_of_tongue';
ALTER TYPE "PopsQuizMark" ADD VALUE IF NOT EXISTS 'close' BEFORE 'tip_of_tongue';
