import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeycloak } from '@react-keycloak/web';
import axios from 'axios';
import _ from 'lodash';
import PropTypes from 'prop-types';
import ApplicationSpinner from '../../components/ApplicationSpinner';
import { useIsMounted, useAxios } from '../../utils/hooks';
import TaskList from './components/TaskList';
import TaskFilters from './components/TaskFilters';

const TasksListPage = ({ taskType }) => {
  const { t } = useTranslation();
  const [keycloak] = useKeycloak();
  const [filters, setFilters] = useState({
    sortBy: 'asc-dueDate',
    groupBy: 'category',
    search: '',
  });
  const [data, setData] = useState({
    isLoading: true,
    tasks: [],
    page: 0,
    total: 0,
    maxResults: 20,
  });
  const isMounted = useIsMounted();
  const axiosInstance = useAxios();
  const handleFilters = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };
  const formatSortByValue = (sortValue) => {
    const [sortOrder, sortVariable] = sortValue.split('-');
    return { sortOrder, sortVariable };
  };

  useEffect(() => {
    const source = axios.CancelToken.source();
    const loadTasks = async () => {
      if (axiosInstance) {
        try {
          const taskCountResponse = await axiosInstance({
            method: 'POST',
            url: '/camunda/engine-rest/task/count',
            cancelToken: source.token,
            data: {
              orQueries: [
                {
                  candidateGroups: keycloak.tokenParsed.groups,
                  assignee: keycloak.tokenParsed.email,
                },
              ],
            },
          });
          const { sortOrder, sortVariable } = formatSortByValue(filters.sortBy);
          const tasksResponse = await axiosInstance({
            method: 'POST',
            url: '/camunda/engine-rest/task',
            cancelToken: source.token,
            params: {
              maxResults: data.maxResults,
              firstResult: data.page,
            },
            data: {
              sorting: [
                {
                  sortBy: sortVariable,
                  sortOrder,
                },
              ],
              orQueries: [
                {
                  candidateGroups: keycloak.tokenParsed.groups,
                  assignee: keycloak.tokenParsed.email,
                },
              ],
              nameLike: `%${filters.search}%`,
            },
          });

          /* If the response from /camunda/engine-rest/task is an empty array, no need to make requests when task list is empty 
          otherwise this will cause /process-instance call to return an error (no process instance ids in the json body). We don't 
          want to show an alert if the search string yields no tasks - this is not an api error */
          if (tasksResponse.data.length === 0) {
            setData({
              isLoading: false,
              tasks: [],
              total: 0,
              page: data.page,
              maxResults: data.maxResults,
            });
          } else {
            // This generates a unique list of process definition ids to use for a call to camunda for task categories
            const processDefinitionIds = _.uniq(
              tasksResponse.data.map((task) => task.processDefinitionId)
            );
            const definitionResponse = await axiosInstance({
              method: 'GET',
              url: '/camunda/engine-rest/process-definition',
              params: {
                processDefinitionIdIn: processDefinitionIds.toString(),
              },
            });
            // This generates a unique list of process instance ids to use for a call to camunda for task business keys
            const processInstanceIds = _.uniq(
              tasksResponse.data.map((task) => task.processInstanceId)
            );
            const processInstanceResponse = await axiosInstance({
              method: 'POST',
              url: '/camunda/engine-rest/process-instance',
              data: {
                processInstanceIds,
              },
            });

            if (isMounted.current) {
              if (definitionResponse.data && definitionResponse.data.length !== 0) {
                tasksResponse.data.forEach((task) => {
                  const processDefinition = _.find(
                    definitionResponse.data,
                    (definition) => definition.id === task.processDefinitionId
                  );
                  const processInstance = _.find(
                    processInstanceResponse.data,
                    (instance) => instance.id === task.processInstanceId
                  );

                  if (processDefinition) {
                    // eslint-disable-next-line no-param-reassign
                    task.category = processDefinition.category;
                  }
                  if (processInstance) {
                    // eslint-disable-next-line no-param-reassign
                    task.businessKey = processInstance.businessKey;
                  }
                });
              }

              setData({
                isLoading: false,
                tasks: tasksResponse.data,
                total: taskCountResponse.data.count,
                page: data.page,
                maxResults: data.maxResults,
              });
            }
          }
        } catch (e) {
          setData({
            isLoading: false,
            tasks: [],
            total: data.total,
            page: data.page,
            maxResults: data.maxResults,
          });
        }
      }
    };
    loadTasks().then(() => {});
    return () => {
      source.cancel('Cancelling request');
    };
  }, [
    setData,
    axiosInstance,
    data.maxResults,
    data.page,
    keycloak.tokenParsed.email,
    keycloak.tokenParsed.groups,
    isMounted,
    filters.sortBy,
    filters.search,
  ]);

  if (data.isLoading) {
    return <ApplicationSpinner />;
  }

  return (
    <>
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">
          <span className="govuk-caption-l">{t(`pages.tasks.${taskType}.caption`)}</span>
          <h1 className="govuk-heading-l">
            {t(`pages.tasks.${taskType}.heading`, { count: data.total })}
          </h1>
        </div>
      </div>
      <div>
        <TaskFilters search={filters.search} handleFilters={handleFilters} />
      </div>
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-full">
          <TaskList tasks={data.tasks} groupBy={filters.groupBy} />
          {data.total > data.maxResults && data.tasks.length < data.total ? (
            <ul className="govuk-list">
              <li>
                <a
                  id="loadMore"
                  onClick={async (e) => {
                    e.preventDefault();
                    const page = data.page + data.maxResults;
                    setData({
                      ...data,
                      page,
                    });
                  }}
                  className="govuk-link"
                  href={`/tasks?firstResult=${data.page + data.maxResults}&maxResults=${
                    data.maxResults
                  }`}
                >
                  {t('pages.forms.list.load-more')}
                </a>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </>
  );
};

TasksListPage.propTypes = {
  taskType: PropTypes.string.isRequired,
};

export default TasksListPage;
