const { paginateResults } = require("./utils");

module.exports = {
  Query: {
    launches: async (_, { pageSize = 20, after }, { dataSources }) => {
      const allLaunches = await dataSources.LaunchAPI.getAllLaunches();
      allLaunches.reverse();
      const launches = paginateResults({
        after,
        pageSize,
        results: allLaunches,
      });
      return {
        launches,
        cursor: launches.length ? launches[launches.length - 1].cursor : null,
        hasMore: launches.length
          ? launches[launches.length - 1].cursor !==
            allLaunches[allLaunches.length - 1].cursor
          : false,
      };
    },
    launch: (_, { id }, { dataSources }) =>
      dataSources.LaunchAPI.getLaunchById({ launchId: id }),
    me: (_, __, { dataSources }) => dataSources.UserAPI.findOrCreateUser(),
  },
  Mission: {
    // The default size is 'LARGE' if not provided
    missionPatch: (mission, { size }) => {
      return size === "SMALL"
        ? mission.missionPatchSmall
        : mission.missionPatchLarge;
    },
  },
  Launch: {
    isBooked: async (launch, _, { dataSources }) =>
      dataSources.UserAPI.isBookedOnLaunch({ launchId: launch.id }),
  },
  User: {
    trips: async (_, __, { dataSources }) => {
      // get ids of launches by user
      const launchIds = await dataSources.UserAPI.getLaunchIdsByUser();
      return !launchIds.length
        ? []
        : dataSources.LaunchAPI.getLaunchesByIds({ launchIds }) || [];
    },
  },
  Mutation: {
    login: async (_, { email }, { dataSources }) => {
      const user = await dataSources.UserAPI.findOrCreateUser({ email });
      if (user) {
        user.token = Buffer.from(email).toString("base64");
        return user;
      }
    },
    bookTrips: async (_, { launchIds }, { dataSources }) => {
      const results = await dataSources.UserAPI.bookTrips({ launchIds });
      const launches = await dataSources.LaunchAPI.getLaunchesByIds({
        launchIds,
      });
      return {
        success: results && results.length === launchIds.length,
        message:
          results.length === launchIds.length
            ? "Trips booked successfully"
            : `The following launches couldn't be booked: ${launchIds.filter(
                (id) => !results.includes(id)
              )}`,
        launches,
      };
    },
    cancelTrip: async (_, { launchId }, { dataSources }) => {
      const result = await dataSources.UserAPI.cancelTrip({ launchId });
      if (!result)
        return {
          success: false,
          message: "Failed to cancel trip",
        };
      const launch = await dataSources.LaunchAPI.getLaunchById({ launchId });
      return {
        success: true,
        message: "Trip cancelled",
        launches: [launch],
      };
    },
  },
};
