import React from "react";
import { useParams } from "react-router-dom";

type ExamRouteParams = {
  examId?: string;
};

export const Exam: React.FC = () => {
  const { examId } = useParams<ExamRouteParams>();

  return (
    <div>
      Exam Page for {examId ?? "Unknown Exam"}
    </div>
  );
};
