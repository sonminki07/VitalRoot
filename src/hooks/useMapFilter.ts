import { useMemo } from "react";
import { useWellnessStore } from "../store/wellnessStore";
import { useCircleStore } from "../store/circleStore";

/**
 * 지도의 만성질환 맞춤형 필터 상태 및 필터링된 코스를 반환하는 훅
 */
export function useMapFilter() {
  const { profile, courses, activeCourseId } = useWellnessStore();
  const { radiusKm } = useCircleStore();

  const filteredCourses = useMemo(() => {
    // 사용자가 선택한 질환(당뇨, 고혈압 등)에 부합하는 코스 우선 정렬
    return courses.filter((course) => {
      if (profile.chronicConditions.length === 0) return true;
      return profile.chronicConditions.some((condition) =>
        course.targetCondition.includes(condition)
      );
    });
  }, [courses, profile.chronicConditions]);

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === activeCourseId) || courses[0];
  }, [courses, activeCourseId]);

  return {
    radiusKm,
    profile,
    filteredCourses: filteredCourses.length > 0 ? filteredCourses : courses,
    activeCourse,
  };
}
