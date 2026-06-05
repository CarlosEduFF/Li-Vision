import { API_BASE_URL } from "@/config/api";
import { authService } from "@/features/auth/authService";
import { profileService } from "@/features/profile/profileService";
import { rankingService } from "@/features/ranking/rankingService";
import { datasetService } from "@/features/training/datasetService";
import { trainingService as trainingSvc } from "@/features/training/trainingService";
import { adminService } from "@/features/training/adminService";

export const trainingService = {
  login: authService.login.bind(authService),
  register: authService.register.bind(authService),

  getProfile: profileService.getProfile.bind(profileService),
  updateProfile: profileService.updateProfile.bind(profileService),
  uploadAvatar: profileService.uploadAvatar.bind(profileService),

  getRanking: rankingService.getRanking.bind(rankingService),

  getDatasets: datasetService.getDatasets.bind(datasetService),
  getDatasetStats: datasetService.getDatasetStats.bind(datasetService),
  deleteDataset: datasetService.deleteDataset.bind(datasetService),
  renameDataset: datasetService.renameDataset.bind(datasetService),
  deleteLabel: datasetService.deleteLabel.bind(datasetService),
  renameLabel: datasetService.renameLabel.bind(datasetService),
  startStaticCollection: datasetService.collectStatic.bind(datasetService),
  startDynamicCollection: datasetService.collectDynamicStart.bind(datasetService),
  stopDynamicCollection: datasetService.collectDynamicStop.bind(datasetService),

  startTraining: trainingSvc.startTraining.bind(trainingSvc),
  getTrainingStatus: trainingSvc.getTrainingStatus.bind(trainingSvc),
  getTrainingStatusByModel: trainingSvc.getTrainingStatusByModel.bind(trainingSvc),
  listModels: trainingSvc.listModels.bind(trainingSvc),
  activateModel: trainingSvc.activateModel.bind(trainingSvc),

  exportSamples: adminService.exportSamples.bind(adminService),
  importSamples: adminService.importSamples.bind(adminService),
  getRulesEnabled: adminService.getRulesEnabled.bind(adminService),
  setRulesEnabled: adminService.setRulesEnabled.bind(adminService),
};
